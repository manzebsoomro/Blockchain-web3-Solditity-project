import { ethers } from "ethers";
import * as db from "./db";
import { distributeTokensToUser } from "./transactionService";
import { logTransactionEvent, logMintEvent } from "./_core/auditLog";
import { notifyOwner } from "./_core/notification";
import { getProvider, rotateProviderOnError, getProviderUrl, getRpcUrls } from "./rpcProvider";

async function alertOwnerRefundNeeded(requestId: string, email: string, amount: number, reason: string, txHashes: { sweep?: string | null; mint?: string | null }) {
  try {
    await notifyOwner({
      title: `Refund Required — Mint ${requestId}`,
      content: `MANUAL REVIEW REQUIRED for mint request ${requestId}\nEmail: ${email}\nAmount: ${amount} tokens\nReason: ${reason}\nSweep tx: ${txHashes.sweep ?? "(none)"}\nMint tx: ${txHashes.mint ?? "(none)"}\n\nUser's ETH was deducted but tokens were not delivered. Either re-mint manually or refund.`,
    });
  } catch (err) {
    console.error(`[Payment Watcher] Failed to notify owner of refund-needed for ${requestId}:`, err);
  }
}

const OWNER_WALLET = (process.env.OWNER_WALLET || "").replace(/^"|"$/g, "");
const POLL_INTERVAL_MS = 5000;
const REQUIRED_CONFIRMATIONS = Math.max(1, parseInt(process.env.CONFIRMATIONS || "3", 10));

// Active provider rotates through SEPOLIA_RPC_URLS on quota/server failures. We read it via
// getProvider() at use sites so a mid-tick rotation is reflected.
function provider() {
  return getProvider();
}

// Circuit breaker: when N consecutive ticks fail with RPC errors, skip ticks for a cooldown
// instead of spamming the failing endpoint and our logs. Auto-resumes on the next attempt.
const TICK_FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;
let consecutiveTickFailures = 0;
let cooldownUntil = 0;
let lastTickErrorLog = 0;

function isRpcError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; info?: { responseStatus?: string } };
  if (e.code === "SERVER_ERROR" || e.code === "UNKNOWN_ERROR" || e.code === "NETWORK_ERROR" || e.code === "TIMEOUT") return true;
  const status = e.info?.responseStatus || "";
  return status.startsWith("403") || status.startsWith("429") || status.startsWith("5");
}

let started = false;

export function startPaymentWatcher() {
  if (started) return;
  started = true;
  const urls = getRpcUrls();
  console.log(`[Payment Watcher] Starting (interval: ${POLL_INTERVAL_MS} ms, RPC endpoints: ${urls.length}, active: ${getProviderUrl()})`);
  setInterval(tick, POLL_INTERVAL_MS);
  void tick();
}

async function tick() {
  // Circuit breaker: during cooldown, skip RPC-touching work but still let owner alerts /
  // expireStale (which is DB-only when wallet lookup fails) attempt to run.
  if (Date.now() < cooldownUntil) return;

  try {
    // Run sequentially so an earlier stage's transition can be picked up in the next stage in the same tick.
    await expireStale();
    await checkPendingPayments();
    await sweepPaid();
    await mintSwept();
    consecutiveTickFailures = 0; // healthy tick
  } catch (err) {
    if (isRpcError(err)) {
      rotateProviderOnError(err);
      consecutiveTickFailures++;
      const now = Date.now();
      // Throttle the error log: at most once every 30s while the circuit is unhealthy.
      if (now - lastTickErrorLog > 30_000) {
        const shortMsg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        console.error(
          `[Payment Watcher] RPC error (${consecutiveTickFailures}/${TICK_FAILURE_THRESHOLD} consecutive failures, active endpoint: ${getProviderUrl()}): ${shortMsg}`,
        );
        lastTickErrorLog = now;
      }
      if (consecutiveTickFailures >= TICK_FAILURE_THRESHOLD) {
        cooldownUntil = now + COOLDOWN_MS;
        console.warn(
          `[Payment Watcher] Circuit breaker tripped — pausing watcher for ${COOLDOWN_MS / 1000}s. All ${getRpcUrls().length} RPC endpoint(s) appear unhealthy. Check SEPOLIA_RPC_URLS env var or RPC quota.`,
        );
        consecutiveTickFailures = 0;
      }
    } else {
      // Non-RPC errors: log normally, don't trip the breaker.
      console.error("[Payment Watcher] tick error:", err);
    }
  }
}

async function expireStale() {
  const pending = await db.getRequestsByStatus("pending");
  const now = Date.now();
  for (const req of pending) {
    if (new Date(req.expiresAt).getTime() >= now) continue;

    const wallet = await db.getWalletByUserId(req.userId);
    let reason = "Mint request expired before payment was received";
    if (wallet) {
      try {
        const balance = await provider().getBalance(wallet.address);
        const required = BigInt(req.requiredEthWei);
        if (balance === BigInt(0)) {
          reason = `No payment received (required ${ethers.formatEther(required)} ETH + gas)`;
        } else if (balance < required) {
          reason = `Insufficient balance: received ${ethers.formatEther(balance)} ETH, required ${ethers.formatEther(required)} ETH`;
        } else {
          // balance >= required but never advanced past `pending` — the sweep gas buffer was never covered.
          reason = `Insufficient balance to cover sweep gas: received ${ethers.formatEther(balance)} ETH, required ${ethers.formatEther(required)} ETH plus gas`;
        }
      } catch (err) {
        // If the RPC is unhealthy, let the tick handler trip the circuit breaker — don't
        // silently swallow it and continue making more RPC calls in the same tick.
        if (isRpcError(err)) throw err;
        console.error(`[Payment Watcher] Could not check balance for expiring ${req.id}:`, err);
      }
    }

    await db.transitionMintRequestStatus(req.id, "pending", "failed", { failureReason: reason });
    console.log(`[Payment Watcher] Request ${req.id} failed at expiry — ${reason}`);
  }
}

async function checkPendingPayments() {
  // FCFS: process oldest first (getRequestsByStatus already orders by createdAt asc)
  const pending = await db.getRequestsByStatus("pending");
  if (pending.length === 0) return;

  // Estimate sweep gas once per tick — we need balance to cover required + gas because the
  // sweep step takes exactly `required` and pays gas from the surplus the user sent.
  // If RPC is down, let the error propagate so the tick handler trips the circuit breaker
  // instead of looping per-request making more failed RPC calls.
  let gasBuffer = BigInt(0);
  try {
    const feeData = await provider().getFeeData();
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
    if (gasPrice) gasBuffer = gasPrice * BigInt(21000);
  } catch (err) {
    if (isRpcError(err)) throw err;
    console.error("[Payment Watcher] Could not fetch gas price for pending check; using 0 buffer:", err);
  }

  // Defense against reorgs: require funds to be settled for REQUIRED_CONFIRMATIONS blocks
  // before marking `paid`. We do this by querying balance at `latest - (N-1)`.
  let confirmedBlockTag: number | "latest" = "latest";
  try {
    const latestBlock = await provider().getBlockNumber();
    confirmedBlockTag = Math.max(0, latestBlock - (REQUIRED_CONFIRMATIONS - 1));
  } catch (err) {
    if (isRpcError(err)) throw err;
    console.error("[Payment Watcher] Could not fetch latest block; falling back to 'latest':", err);
  }

  for (const req of pending) {
    if (new Date(req.expiresAt).getTime() < Date.now()) continue;

    const wallet = await db.getWalletByUserId(req.userId);
    if (!wallet) continue;

    const balance = await provider().getBalance(wallet.address, confirmedBlockTag);
    const required = BigInt(req.requiredEthWei);

    if (balance >= required + gasBuffer) {
      const updated = await db.transitionMintRequestStatus(req.id, "pending", "paid", {
        paidAt: new Date(),
      });
      if (updated) {
        console.log(
          `[Payment Watcher] Request ${req.id} marked PAID (balance ${balance} wei >= required ${required} wei + gas ${gasBuffer} wei, confirmed @ block ${confirmedBlockTag})`,
        );
        logTransactionEvent("transaction_confirmed", req.userId, req.email, undefined, undefined, "success", {
          requestId: req.id,
          kind: "payment",
          balanceWei: balance.toString(),
          requiredWei: required.toString(),
        });
      }
    }
  }
}

async function mintSwept() {
  const swept = await db.getRequestsByStatus("swept");
  for (const req of swept) {
    if (!req.emailVerified) continue; // wait until user has emailed in the decoded morse

    const wallet = await db.getWalletByUserId(req.userId);
    if (!wallet) {
      // No wallet but ETH was already swept — this needs manual refund. Don't use "failed",
      // which implies nothing was deducted.
      console.error(`[Payment Watcher] No wallet for user ${req.userId} on ${req.id} after sweep — MANUAL REFUND REQUIRED`);
      logMintEvent("refund_required", req.userId, req.email, req.id, undefined, "failure", {
        reason: "no_wallet_after_sweep",
        sweepTxHash: req.sweepTxHash,
        requiredEthWei: req.requiredEthWei,
      });
      await db.transitionMintRequestStatus(req.id, "swept", "mint_failed_refund_needed", {
        failureReason: "No wallet linked to user account at mint time — refund required",
      });
      void alertOwnerRefundNeeded(req.id, req.email, req.amount, "No wallet linked at mint time", {
        sweep: req.sweepTxHash,
        mint: null,
      });
      continue;
    }

    // Atomically claim the mint (swept → minting) so a concurrent tick cannot double-spend.
    const claimed = await db.transitionMintRequestStatus(req.id, "swept", "minting");
    if (!claimed) continue;

    const tokenWei = ethers.parseUnits(String(req.amount), 18).toString();
    let result: Awaited<ReturnType<typeof distributeTokensToUser>>;
    try {
      result = await distributeTokensToUser(wallet.address, tokenWei, req.id, REQUIRED_CONFIRMATIONS);
    } catch (err) {
      // distributeTokensToUser is wrapped in try/catch internally, but defend against re-throws.
      console.error(`[Payment Watcher] Mint error for ${req.id}:`, err);
      result = {
        success: false,
        error: err instanceof Error ? err.message : "unknown error",
        submitted: false,
      };
    }

    if (result.success && result.txHash) {
      // Persist tx hash + mark minted.
      await db.transitionMintRequestStatus(req.id, "minting", "minted", {
        mintTxHash: result.txHash,
        mintedAt: new Date(),
      });
      await db.createTransaction(req.id, result.txHash, "mint");
      logTransactionEvent("transaction_confirmed", req.userId, req.email, result.txHash, undefined, "success", {
        requestId: req.id,
        kind: "mint",
        amount: req.amount,
      });
      console.log(`[Payment Watcher] Request ${req.id} MINTED (${req.amount} tokens, tx ${result.txHash})`);
    } else if (result.submitted) {
      // ETH was already swept AND the mint tx was broadcast but wait failed / reverted.
      // This is the dangerous case: don't mark "failed" (implies refund of nothing). Mark
      // refund-needed so an operator can manually verify and either re-send tokens or refund.
      console.error(
        `[Payment Watcher] Mint tx submitted but not confirmed for ${req.id} (tx ${result.txHash}): ${result.error} — MANUAL REVIEW REQUIRED`,
      );
      logMintEvent("refund_required", req.userId, req.email, req.id, undefined, "failure", {
        reason: "mint_submitted_unconfirmed",
        mintTxHash: result.txHash,
        sweepTxHash: req.sweepTxHash,
        error: result.error,
        amount: req.amount,
      });
      await db.transitionMintRequestStatus(req.id, "minting", "mint_failed_refund_needed", {
        mintTxHash: result.txHash ?? null,
        failureReason: `Mint submitted but not confirmed: ${result.error ?? "unknown error"} — manual review required`,
      });
      void alertOwnerRefundNeeded(req.id, req.email, req.amount, `Mint submitted but not confirmed: ${result.error}`, {
        sweep: req.sweepTxHash,
        mint: result.txHash ?? null,
      });
    } else {
      // Mint never broadcast — but ETH was already swept to owner. Still needs refund.
      console.error(`[Payment Watcher] Mint failed pre-submission for ${req.id}: ${result.error} — MANUAL REFUND REQUIRED`);
      logMintEvent("refund_required", req.userId, req.email, req.id, undefined, "failure", {
        reason: "mint_submit_failed",
        sweepTxHash: req.sweepTxHash,
        error: result.error,
        amount: req.amount,
      });
      await db.transitionMintRequestStatus(req.id, "minting", "mint_failed_refund_needed", {
        failureReason: `Token distribution failed before broadcast: ${result.error ?? "unknown error"} — refund required`,
      });
      void alertOwnerRefundNeeded(req.id, req.email, req.amount, `Mint failed pre-submission: ${result.error}`, {
        sweep: req.sweepTxHash,
        mint: null,
      });
    }
  }
}

async function sweepPaid() {
  if (!OWNER_WALLET || !ethers.isAddress(OWNER_WALLET)) {
    console.error("[Payment Watcher] OWNER_WALLET missing or invalid — cannot sweep");
    return;
  }

  const paid = await db.getRequestsByStatus("paid");
  for (const req of paid) {
    // Recovery FIRST: if a previous tick already broadcast a sweep tx but the status never
    // advanced (e.g. tx.wait() threw on a transient RPC error), reconcile via on-chain lookup
    // BEFORE any other gate (don't let email-unverified block confirmation of a tx that
    // already moved ETH).
    if (req.sweepTxHash) {
      await reconcileInFlightSweep(req.id, req.userId, req.email, req.sweepTxHash);
      continue;
    }

    // Don't sweep until the morse challenge has been verified by email. This means ETH is
    // ONLY deducted after the email step succeeds — matching the "process and confirm before
    // deduct" requirement.
    if (!req.emailVerified) {
      // If the request is past expiry, mark failed (ETH stays in deposit wallet, user can
      // reclaim via private-key export). expireStale only handles `pending`, so do it here.
      if (new Date(req.expiresAt).getTime() < Date.now()) {
        await db.transitionMintRequestStatus(req.id, "paid", "failed", {
          failureReason: "Mint request expired before email verification was received (no ETH deducted)",
        });
        console.log(`[Payment Watcher] Request ${req.id} expired in 'paid' (no email verification) — marked failed, no ETH deducted`);
      }
      continue;
    }

    const wallet = await db.getWalletByUserId(req.userId);
    if (!wallet || !(wallet as any).privateKey) {
      console.error(`[Payment Watcher] Wallet/private key missing for request ${req.id} — marking failed`);
      await db.transitionMintRequestStatus(req.id, "paid", "failed", {
        failureReason: "Deposit wallet or signing key unavailable",
      });
      continue;
    }

    try {
      const userSigner = new ethers.Wallet((wallet as any).privateKey, provider());
      const balance = await provider().getBalance(wallet.address);
      const required = BigInt(req.requiredEthWei);

      const feeData = await provider().getFeeData();
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
      if (!gasPrice) {
        console.error(`[Payment Watcher] Could not get gas price for sweep on ${req.id}`);
        continue;
      }
      const gasLimit = BigInt(21000);
      const gasCost = gasPrice * gasLimit;

      // Sweep EXACTLY the required amount. Gas is paid from the deposit wallet's surplus,
      // so the user must have sent `required + gas` (the mint prompt asks them to). Any
      // remaining surplus stays in the deposit wallet for the user to reclaim.
      if (balance < required + gasCost) {
        const reason = `Insufficient balance to sweep exact amount (balance ${ethers.formatEther(balance)} ETH, need ${ethers.formatEther(required)} ETH + ${ethers.formatEther(gasCost)} ETH gas)`;
        console.error(`[Payment Watcher] ${reason} for ${req.id}`);
        await db.transitionMintRequestStatus(req.id, "paid", "failed", { failureReason: reason });
        continue;
      }

      const sendValue = required;
      const tx = await userSigner.sendTransaction({
        to: OWNER_WALLET,
        value: sendValue,
        gasLimit,
        gasPrice,
      });
      // Persist the tx hash BEFORE awaiting confirmation. If tx.wait() throws (RPC timeout,
      // disconnect, etc.) the next tick will reconcile via reconcileInFlightSweep() instead of
      // re-broadcasting from a now-empty wallet.
      await db.setSweepTxHash(req.id, tx.hash);
      console.log(`[Payment Watcher] Sweeping ${sendValue} wei from ${wallet.address} → ${OWNER_WALLET} (tx ${tx.hash}) for request ${req.id}`);
      logTransactionEvent("transaction_initiated", req.userId, req.email, tx.hash, undefined, "success", {
        requestId: req.id,
        kind: "sweep",
        from: wallet.address,
        to: OWNER_WALLET,
        valueWei: sendValue.toString(),
      });

      try {
        // Wait for REQUIRED_CONFIRMATIONS, not just inclusion in a block.
        const receipt = await tx.wait(REQUIRED_CONFIRMATIONS);
        await applySweepReceipt(req.id, req.userId, req.email, tx.hash, receipt);
      } catch (waitErr) {
        // Don't mark failed here — the tx is on-chain, just confirmation failed. Next tick reconciles.
        console.error(`[Payment Watcher] tx.wait() failed for ${req.id} (tx ${tx.hash}), will reconcile on next tick:`, waitErr);
      }
    } catch (err) {
      console.error(`[Payment Watcher] Sweep error for ${req.id}:`, err);
    }
  }
}

// Apply a sweep receipt to DB state. Verifies the receipt's recipient against the configured
// owner address (defense in depth) and transitions paid→swept on success or paid→failed on revert.
async function applySweepReceipt(
  requestId: string,
  userId: number,
  email: string,
  txHash: string,
  receipt: ethers.TransactionReceipt | null,
) {
  if (!receipt) {
    console.error(`[Payment Watcher] Sweep receipt null for ${requestId} (tx ${txHash}) — will reconcile next tick`);
    return;
  }
  if (receipt.status !== 1) {
    console.error(`[Payment Watcher] Sweep tx ${txHash} reverted on-chain for ${requestId}`);
    logTransactionEvent("transaction_failed", userId, email, txHash, undefined, "failure", {
      requestId,
      kind: "sweep",
      reason: "reverted on-chain",
    });
    await db.transitionMintRequestStatus(requestId, "paid", "failed", {
      failureReason: `Sweep transaction reverted on-chain (tx ${txHash})`,
    });
    return;
  }
  // Defense in depth: verify the on-chain recipient matches our configured owner address.
  const receiptTo = (receipt.to || "").toLowerCase();
  const expectedTo = OWNER_WALLET.toLowerCase();
  if (receiptTo !== expectedTo) {
    const reason = `Sweep recipient mismatch: tx ${txHash} sent to ${receipt.to}, expected ${OWNER_WALLET}`;
    console.error(`[Payment Watcher] ${reason} for ${requestId}`);
    logTransactionEvent("transaction_failed", userId, email, txHash, undefined, "failure", {
      requestId,
      kind: "sweep",
      reason,
    });
    await db.transitionMintRequestStatus(requestId, "paid", "failed", { failureReason: reason });
    return;
  }
  const updated = await db.transitionMintRequestStatus(requestId, "paid", "swept", {
    sweptAt: new Date(),
  });
  if (updated) {
    await db.createTransaction(requestId, txHash, "sweep");
    logTransactionEvent("transaction_confirmed", userId, email, txHash, undefined, "success", {
      requestId,
      kind: "sweep",
      blockNumber: receipt.blockNumber,
    });
    console.log(`[Payment Watcher] Request ${requestId} marked SWEPT (tx ${txHash}, block ${receipt.blockNumber})`);
  }
}

// Reconcile a sweep tx whose hash is already recorded against a still-`paid` request.
// Decides between swept / failed / wait-for-next-tick based on on-chain state, gated on
// REQUIRED_CONFIRMATIONS so we never advance until the network considers the tx final.
async function reconcileInFlightSweep(
  requestId: string,
  userId: number,
  email: string,
  txHash: string,
) {
  try {
    const receipt = await provider().getTransactionReceipt(txHash);
    if (!receipt) {
      // Receipt not yet available. Wait for next tick. Never re-broadcast — the wallet may
      // already be drained.
      const tx = await provider().getTransaction(txHash);
      if (tx) {
        console.log(`[Payment Watcher] Sweep tx ${txHash} for ${requestId} still pending, will retry next tick`);
      } else {
        console.log(`[Payment Watcher] Sweep tx ${txHash} for ${requestId} not yet visible to RPC, will retry next tick`);
      }
      return;
    }
    // Receipt exists — check confirmations before advancing.
    const currentBlock = await provider().getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;
    if (confirmations < REQUIRED_CONFIRMATIONS) {
      console.log(
        `[Payment Watcher] Sweep tx ${txHash} for ${requestId} has ${confirmations}/${REQUIRED_CONFIRMATIONS} confirmations, waiting`,
      );
      return;
    }
    await applySweepReceipt(requestId, userId, email, txHash, receipt);
  } catch (err) {
    console.error(`[Payment Watcher] Reconcile error for ${requestId} (tx ${txHash}):`, err);
  }
}

