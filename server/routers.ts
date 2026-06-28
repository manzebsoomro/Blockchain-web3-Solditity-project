import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { generateOTP, isValidEmail, isValidOTP, isCodeExpired, isMaxAttemptsExceeded, MAX_VERIFICATION_ATTEMPTS } from "./emailVerification";
import { generateMintSignature, generateMintRequestId, calculateMintExpiry, generateMintPromptContent, generateMorseChallenge } from "./mintRequest";
import { getProvider } from "./rpcProvider";
import { encodeToMorse } from "./emailListener";
import { ethers } from "ethers";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import {
  requestCodeSchema,
  verifyCodeSchema,
  connectWalletSchema,
  generateMintRequestSchema,
  getLatestRequestsSchema,
  updateRequestStatusSchema,
  executeMintTransactionSchema,
  getTransactionHistorySchema,
} from "./validation";
import { logAuthEvent, logWalletEvent, logMintEvent } from "./_core/auditLog";
import { sendOTPEmail, sendMintRequestNotification } from "./_core/emailService";
import { getTier } from "../shared/mintTiers";

// OTP acts as password - required for every login

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  email: router({
    /**
     * Request verification code - generates and stores OTP
     * OTP acts as password - required for every login attempt
     */
    requestCode: publicProcedure
      .input(requestCodeSchema)
      .mutation(async ({ input, ctx }) => {
        let { email } = input;
        
        // Normalize email to lowercase for consistency
        email = email.toLowerCase().trim();

        if (!isValidEmail(email)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid email format",
          });
        }

        try {
          // Generate new OTP - every login requires fresh OTP
          const code = generateOTP();
          console.log(`[OTP] Generated for ${email}: ${code}`);

          // Store in database (deletes old codes first)
          await db.deleteVerificationCode(email);
          const createResult = await db.createVerificationCode(email, code, 10); // 10 minute expiry
          console.log(`[OTP] Stored in DB for ${email}: ${code}`);

          // Send email with OTP code
          const emailResult = await sendOTPEmail(email, code);
          if (!emailResult.success) {
            console.warn(`[Email Verification] Failed to send OTP to ${email}:`, emailResult.error);
            // Don't fail the request - code is stored in DB for testing
          } else {
            console.log(`[OTP] Email sent to ${email} with code: ${code}`);
          }

          return {
            success: true,
            message: "Verification code sent to email",
          };
        } catch (error) {
          console.error("[Email Verification] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send verification code",
          });
        }
      }),

    /**
     * Verify code and create user session
     */
    verifyCode: publicProcedure
      .input(verifyCodeSchema)
      .mutation(async ({ input, ctx }) => {
        let { email, code } = input;
        
        // Normalize email to lowercase and code to remove whitespace
        email = email.toLowerCase().trim();
        code = code.trim();

        if (!isValidOTP(code)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid code format",
          });
        }

        try {
          // Get verification code from database
          const storedCode = await db.getVerificationCode(email);
          console.log(`[OTP] Retrieved from DB for ${email}:`, storedCode ? `${storedCode.code} (attempts: ${storedCode.attempts})` : 'NOT FOUND');
          console.log(`[OTP] User submitted code: ${code}`);

          if (!storedCode) {
            console.warn(`[OTP] Code not found in database for ${email}`);
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Verification code not found or expired",
            });
          }

          // Check if expired
          if (isCodeExpired(storedCode.expiresAt)) {
            console.warn(`[OTP] Code expired for ${email}. Expires at: ${storedCode.expiresAt}`);
            await db.deleteVerificationCode(email);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Verification code expired",
            });
          }

          // Check max attempts
          if (isMaxAttemptsExceeded(storedCode.attempts, MAX_VERIFICATION_ATTEMPTS)) {
            console.warn(`[OTP] Max attempts exceeded for ${email}. Attempts: ${storedCode.attempts}`);
            await db.deleteVerificationCode(email);
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Too many failed attempts",
            });
          }

          // Verify code
          if (storedCode.code !== code) {
            console.warn(`[OTP] Code mismatch for ${email}. Expected: ${storedCode.code}, Got: ${code}`);
            await db.incrementVerificationAttempts(email);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid verification code",
            });
          }
          console.log(`[OTP] Code verified successfully for ${email}`);

          // Code is valid - create or update user
          const existingVerification = await db.getEmailVerification(email);

          let user: Awaited<ReturnType<typeof db.getUserByOpenId>>;

          if (existingVerification) {
            // Get existing user by ID
            user = await db.getUserById(existingVerification.userId);
            if (!user) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to retrieve existing user",
              });
            }
          } else {
            // Create new user
            const newOpenId = `email_${nanoid()}`;
            await db.upsertUser({
              openId: newOpenId,
              email,
              name: email.split("@")[0],
              loginMethod: "email",
            });

            // Get the created user
            user = await db.getUserByOpenId(newOpenId);
            if (!user) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create user",
              });
            }

            // Record email verification
            await db.createEmailVerification(user.id, email);
          }

          // Clean up verification code
          await db.deleteVerificationCode(email);

          // Auto-generate wallet if user doesn't have one
          let userWallet = await db.getWalletByUserId(user.id);
          if (!userWallet) {
            try {
              const newWallet = ethers.Wallet.createRandom();
              await db.createWallet(user.id, newWallet.address, newWallet.privateKey, 11155111);
              userWallet = await db.getWalletByUserId(user.id);
              console.log(`[Auth] Generated wallet for user ${user.id} (${email}): ${userWallet?.address}`);
            } catch (walletError) {
              console.error(`[Auth] Failed to generate wallet for user ${user.id}:`, walletError);
              // Don't fail login if wallet generation fails
            }
          } else {
            console.log(`[Auth] User ${user.id} (${email}) already has wallet: ${userWallet.address}`);
          }

          // Create session token
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || email.split("@")[0],
          });

          // Set session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for email login
          });

          // Log auth event
          logAuthEvent('login', user.id, email, ctx.req, 'success');

          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Email Verification] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to verify code",
          });
        }
      }),
  }),

  mint: router({
    /**
     * Generate a new mint request
     */
    generateRequest: protectedProcedure
      .input(generateMintRequestSchema)
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user.id;
        const email = ctx.user.email;

        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email not verified",
          });
        }

        const tier = getTier(input.amount);
        if (!tier) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid mint amount tier",
          });
        }

        try {
          const wallet = await db.getWalletByUserId(userId);
          if (!wallet) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No wallet linked to this account",
            });
          }

          const MAX_ACTIVE_MINT_REQUESTS = 5;
          const MAX_LIFETIME_TOKENS_PER_EMAIL = 100000;

          const activeCount = await db.countActiveMintRequestsByUserId(userId);
          if (activeCount >= MAX_ACTIVE_MINT_REQUESTS) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `You already have ${activeCount} active mint requests (max ${MAX_ACTIVE_MINT_REQUESTS}). Wait for some to complete or expire before creating another.`,
            });
          }

          // Lifetime cap: total tokens already minted + in-flight per email cannot exceed 100k.
          const committed = await db.getCommittedTokensByEmail(email);
          if (committed + tier.tokens > MAX_LIFETIME_TOKENS_PER_EMAIL) {
            const remaining = Math.max(0, MAX_LIFETIME_TOKENS_PER_EMAIL - committed);
            throw new TRPCError({
              code: "CONFLICT",
              message: `Lifetime mint cap reached for this email. Already committed: ${committed.toLocaleString()} tokens; cap: ${MAX_LIFETIME_TOKENS_PER_EMAIL.toLocaleString()}; remaining: ${remaining.toLocaleString()}.`,
            });
          }

          const requestId = generateMintRequestId();
          const expiresAt = calculateMintExpiry(10);
          const requiredEthWei = ethers.parseEther(tier.ethCost).toString();

          const requestData = {
            userId,
            email,
            chainId: 11155111,
            amount: tier.tokens,
            requiredEthWei,
            expiresAt,
          };

          const signature = generateMintSignature(requestData, email);
          const morseChallenge = generateMorseChallenge();

          await db.createMintRequest(requestId, userId, email, signature, tier.tokens, requiredEthWei, 10, morseChallenge);

          logMintEvent('request_generated', userId, email, requestId, ctx.req, 'success', { amount: tier.tokens, chainId: 11155111 });

          // Morse-encode the CHALLENGE (not the request ID). The challenge appears in
          // plaintext nowhere in the email — only as morse — so the user must actually
          // decode it to reply correctly. This is the actual verification gate.
          const morsePrompt = encodeToMorse(morseChallenge);
          const mintInboxAddress = process.env.EMAIL_USER || "(mint inbox not configured)";
          const promptContent = `MORSE VERIFICATION CHALLENGE: ${morsePrompt}\n\n${generateMintPromptContent(requestId, signature, email, wallet.address, tier.tokens, tier.ethCost, mintInboxAddress)}`;

          try {
            const ownerEmail = process.env.OWNER_EMAIL || "owner@example.com";
            await sendMintRequestNotification(
              ownerEmail,
              email,
              userId,
              requestId,
              tier.tokens,
              1
            );
          } catch (notifyError) {
            console.warn("[Mint] Failed to notify owner:", notifyError);
          }

          return {
            success: true,
            requestId,
            signature,
            promptContent,
            expiresAt,
            email,
            walletAddress: wallet.address,
            amount: tier.tokens,
            requiredEth: tier.ethCost,
            message: "Mint request generated successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Mint] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate mint request",
          });
        }
      }),

    /**
     * Get latest mint requests for user (newest first)
     */
    getLatestRequests: protectedProcedure
      .input(getLatestRequestsSchema)
      .query(async ({ input, ctx }) => {
        try {
          const requests = await db.getMintRequestsByUserId(ctx.user.id, input.limit);
          // Sort newest first
          const sorted = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return sorted.map((req) => ({
            id: req.id,
            status: req.status,
            amount: req.amount,
            requiredEthWei: req.requiredEthWei,
            paymentTxHash: req.paymentTxHash,
            sweepTxHash: req.sweepTxHash,
            mintTxHash: req.mintTxHash,
            failureReason: req.failureReason,
            createdAt: req.createdAt,
            expiresAt: req.expiresAt,
            isExpired: new Date() > req.expiresAt,
          }));
        } catch (error) {
          console.error("[Mint] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch mint requests",
          });
        }
      }),

    /**
     * Cancel a pending mint request. Only `pending` requests (no payment received yet) can be
     * cancelled by the user. All other state transitions are owned by the payment watcher.
     */
    updateRequestStatus: protectedProcedure
      .input(updateRequestStatusSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { requestId, status } = input;
          const request = await db.getMintRequest(requestId);

          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Mint request not found",
            });
          }

          // Verify ownership
          if (request.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to update this request",
            });
          }

          // Only allow cancellation of pending requests. Disallow any other client-driven
          // transition; the payment watcher is the sole authority for paid/swept/minted/failed.
          if (status !== "failed") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Clients may only cancel (status='failed') their own pending requests",
            });
          }
          if (request.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot cancel request in status '${request.status}'`,
            });
          }

          const cancelled = await db.transitionMintRequestStatus(requestId, "pending", "failed", {
            failureReason: "Cancelled by user",
          });
          if (!cancelled) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Request status changed concurrently; refresh and try again",
            });
          }

          return {
            success: true,
            requestId,
            status,
            message: "Mint request status updated",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Mint] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update mint request status",
          });
        }
      }),
  }),

  wallet: router({
    /**
     * Auto-generate wallet if user doesn't have one
     */
    generateWallet: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          const userId = ctx.user.id;
          
          // Check if wallet already exists
          let wallet = await db.getWalletByUserId(userId);
          if (wallet) {
            return {
              success: true,
              address: wallet.address,
              message: "Wallet already exists",
            };
          }

          // Generate new wallet
          const newWallet = ethers.Wallet.createRandom();
          await db.createWallet(userId, newWallet.address, newWallet.privateKey, 11155111);
          
          wallet = await db.getWalletByUserId(userId);
          console.log(`[Wallet] Generated wallet for user ${userId}: ${wallet?.address}`);
          
          return {
            success: true,
            address: wallet?.address,
            message: "Wallet generated successfully",
          };
        } catch (error) {
          console.error("[Wallet] Error generating wallet:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate wallet",
          });
        }
      }),

    /**
     * Connect wallet to user account
     */
    connect: protectedProcedure
      .input(connectWalletSchema)
      .mutation(async ({ input, ctx }) => {
        const { address } = input;
        const userId = ctx.user.id;

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Ethereum address format",
          });
        }

        try {
          // Check if user already has a wallet
          const userWallet = await db.getWalletByUserId(userId);
          if (userWallet) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "User already has a wallet. Each user can only have one wallet.",
            });
          }

          // Check if address already connected to another user
          const existingWallet = await db.getWalletByAddress(address);
          if (existingWallet && existingWallet.userId !== userId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Wallet address already connected to another account",
            });
          }

          // Import external wallet without private key access
          await db.createWallet(userId, address, "", 11155111);

          // Log wallet connection
          logWalletEvent('wallet_connected', userId, ctx.user.email || 'unknown', address, ctx.req, 'success');

          return {
            success: true,
            address,
            message: "Wallet imported successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Wallet] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to connect wallet",
          });
        }
      }),

    /**
     * Get connected wallet
     */
    getConnected: protectedProcedure.query(async ({ ctx }) => {
      try {
        const wallet = await db.getWalletByUserId(ctx.user.id);
        return wallet || null;
      } catch (error) {
        console.error("[Wallet] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch wallet",
        });
      }
    }),

    /**
     * Get live ETH and ERC-20 token balances for the user's wallet (Sepolia).
     */
    getBalances: protectedProcedure.query(async ({ ctx }) => {
      const wallet = await db.getWalletByUserId(ctx.user.id);
      if (!wallet) {
        return { address: null, ethWei: "0", tokenWei: "0" };
      }
      try {
        const TOKEN_ADDRESS = "0xF81816f3221B916371a5846599D6662F62f0d4b9";
        const provider = getProvider();
        const erc20 = new ethers.Contract(
          TOKEN_ADDRESS,
          ["function balanceOf(address) view returns (uint256)"],
          provider,
        );
        const [ethWei, tokenWei] = await Promise.all([
          provider.getBalance(wallet.address),
          erc20.balanceOf(wallet.address) as Promise<bigint>,
        ]);
        return {
          address: wallet.address,
          ethWei: ethWei.toString(),
          tokenWei: tokenWei.toString(),
        };
      } catch (error) {
        console.error("[Wallet] getBalances error:", error);
        return { address: wallet.address, ethWei: "0", tokenWei: "0" };
      }
    }),

    /**
     * Export wallet private key
     */
    exportPrivateKey: protectedProcedure.query(async ({ ctx }) => {
      try {
        const userId = ctx.user.id;
        const wallet = await db.getWalletByUserId(userId);
        
        if (!wallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Wallet not found",
          });
        }

        // Return wallet address and private key (decrypted by db function)
        if (!wallet.privateKey) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to decrypt private key",
          });
        }

        logWalletEvent('private_key_exported', userId, ctx.user.email || 'unknown', wallet.address, ctx.req, 'success');

        return {
          address: wallet.address,
          privateKey: wallet.privateKey,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Wallet] Error exporting private key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export private key",
        });
      }
    }),
  }),

  transaction: router({
    /**
     * Execute mint transaction
     */
    execute: protectedProcedure
      .input(executeMintTransactionSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const { requestId, walletAddress } = input;
          
          // Verify request exists and belongs to user
          const request = await db.getMintRequest(requestId);
          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Mint request not found",
            });
          }

          if (request.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to execute this request",
            });
          }

          // Check if request expired
          if (new Date() > request.expiresAt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Mint request has expired",
            });
          }

          // Only `pending` requests can be (re-)acknowledged here. We do NOT reset status —
          // the watcher owns all state transitions. This endpoint is a notification trigger,
          // not a way to revive failed/minted requests.
          if (request.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot execute request in status '${request.status}' (only 'pending' is valid)`,
            });
          }

          // Notify owner of transaction execution
          try {
            await notifyOwner({
              title: "Transaction Executed",
              content: `User ${ctx.user.email} (ID: ${ctx.user.id}) executed mint transaction for request ${requestId}. Wallet: ${walletAddress}`,
            });
          } catch (notifyError) {
            console.warn("[Transaction] Failed to notify owner:", notifyError);
          }

          return {
            success: true,
            requestId,
            status: request.status,
            message: "Transaction initiated",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Transaction] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to execute transaction",
          });
        }
      }),

    /**
     * Get transaction history
     */
    getHistory: protectedProcedure
      .input(getTransactionHistorySchema)
      .query(async ({ input, ctx }) => {
        try {
          const transactions = await db.getTransactionsByUserId(ctx.user.id, input.limit);
          const sorted = transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return sorted.map((tx) => ({
            id: tx.id,
            requestId: tx.requestId,
            status: tx.status,
            txHash: tx.txHash,
            blockNumber: tx.blockNumber,
            gasUsed: tx.gasUsed,
            createdAt: tx.createdAt,
          }));
        } catch (error) {
          console.error("[Transaction] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch transaction history",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
