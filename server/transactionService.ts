import { ethers } from "ethers";
import dotenv from "dotenv";
import { getProvider } from "./rpcProvider";

dotenv.config();

/**
 * Transaction service for Ethereum interactions
 * Integrated with Ethers.js for Sepolia testnet
 * Strictly backend-controlled distribution flow
 */

const PRIVATE_KEY = process.env.PRIVATE_KEY; // Backend owner/signer key
const MINT_TOKEN_ADDRESS = "0xF81816f3221B916371a5846599D6662F62f0d4b9";
const MINT_MASTER_ADDRESS = "0x9c428A8A523cDB64f4558648d3D20737590bd70e";

// Wallet is bound to whichever provider is active when the module loads. If the active
// provider rotates due to upstream failure, callers can pass the current provider via getProvider()
// for read calls; the signer's bound provider will recover after a process restart. For our
// volume on Sepolia, this is acceptable. (Rebinding mid-call would race with in-flight txs.)
const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, getProvider()) : null;

// ABI for MintMaster distribution
const MINT_MASTER_ABI = [
  "function distributeTokens(address user, uint256 amount, string requestId) external",
  "function totalDistributed() public view returns (uint256)",
  "event TokensDistributed(address indexed user, uint256 amount, string requestId)"
];

export interface TransactionData {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
  gasUsed?: number;
  timestamp: Date;
}

export interface DistributionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Distribute tokens to a user after backend verification.
 * This is called by the backend after verifying email and payment.
 *
 * Returns:
 *  - {success:true, txHash}                              — confirmed
 *  - {success:false, error, submitted:false}             — never broadcast (safe to retry/mark failed)
 *  - {success:false, error, txHash?, submitted:true}     — broadcast but unconfirmed/reverted
 *    (the caller must NOT retry blindly — ETH was already swept; manual review)
 */
export async function distributeTokensToUser(
  userAddress: string,
  tokenAmount: string, // in wei
  requestId: string,
  confirmations: number = 1,
): Promise<DistributionResult & { submitted?: boolean }> {
  if (!wallet) {
    return { success: false, error: "Backend wallet not configured", submitted: false };
  }

  console.log(`[Transaction Service] Distributing ${tokenAmount} tokens to ${userAddress} for request ${requestId}`);

  const mintMaster = new ethers.Contract(MINT_MASTER_ADDRESS, MINT_MASTER_ABI, wallet);

  let tx: ethers.ContractTransactionResponse;
  try {
    tx = await mintMaster.distributeTokens(userAddress, tokenAmount, requestId);
  } catch (error) {
    // Submission failed — nothing was broadcast.
    console.error("[Transaction Service] Distribution submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      submitted: false,
    };
  }

  try {
    const receipt = await tx.wait(confirmations);
    if (receipt && receipt.status === 1) {
      // Defense in depth: verify the receipt's recipient is the expected mint contract.
      const receiptTo = (receipt.to || "").toLowerCase();
      if (receiptTo !== MINT_MASTER_ADDRESS.toLowerCase()) {
        return {
          success: false,
          txHash: receipt.hash,
          error: `Mint recipient mismatch: tx to ${receipt.to}, expected ${MINT_MASTER_ADDRESS}`,
          submitted: true,
        };
      }
      return { success: true, txHash: receipt.hash, submitted: true };
    }
    return {
      success: false,
      txHash: tx.hash,
      error: "Mint transaction reverted on-chain",
      submitted: true,
    };
  } catch (error) {
    // Tx was broadcast, but wait failed — possibly confirmed, possibly not. Caller must
    // reconcile manually (the tx hash is recorded; ETH is already swept).
    console.error("[Transaction Service] Distribution wait error:", error);
    return {
      success: false,
      txHash: tx.hash,
      error: error instanceof Error ? error.message : "Unknown error",
      submitted: true,
    };
  }
}

/**
 * Check transaction status on Ethereum
 */
export async function checkTransactionStatus(txHash: string): Promise<any> {
  try {
    const receipt = await getProvider().getTransactionReceipt(txHash);
    if (!receipt) return { status: "pending" };
    return {
      status: receipt.status === 1 ? "confirmed" : "failed",
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("[Transaction Service] Status Check Error:", error);
    return { status: "error", error: "Failed to check status" };
  }
}

/**
 * Monitor a wallet for incoming ETH payment
 * This would be used by the backend listener
 */
export async function monitorPayment(walletAddress: string, expectedAmount: string): Promise<boolean> {
  try {
    const balance = await getProvider().getBalance(walletAddress);
    const expected = ethers.parseEther(expectedAmount);
    return balance >= expected;
  } catch (error) {
    console.error("[Transaction Service] Payment Monitor Error:", error);
    return false;
  }
}
