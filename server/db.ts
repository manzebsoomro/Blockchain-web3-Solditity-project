import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { eq, and, desc, gt, inArray, sql } from "drizzle-orm";
import { users, verificationCodes, emailVerifications, wallets, mintRequests, transactions } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { encrypt, decrypt, type EncryptedData } from "./_core/encryption";

const queryClient = postgres(ENV.databaseUrl);
export const db = drizzle(queryClient, { schema });

export async function validateDbConnection() {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// ============ USER QUERIES ============
export async function upsertUser(data: any) {
  const existing = await db.select().from(users).where(eq(users.openId, data.openId)).execute();
  if (existing.length > 0) {
    return db.update(users).set(data).where(eq(users.openId, data.openId)).execute();
  }
  return db.insert(users).values(data).execute();
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).execute();
  return result[0] || null;
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).execute();
  return result[0] || null;
}

// ============ VERIFICATION QUERIES ============
export async function createVerificationCode(email: string, code: string, expiryMinutes: number | Date) {
  // FIX: The postgres library has a critical timezone bug where passing Date objects
  // treats local time as UTC, causing 5-hour offset issues. Use raw SQL with NOW() instead.
  
  let minutes = 10;
  if (expiryMinutes instanceof Date) {
    // If given a specific Date, convert to minutes from now for raw SQL
    const nowMs = Date.now();
    const expiryMs = expiryMinutes.getTime();
    minutes = Math.round((expiryMs - nowMs) / 60000);
    if (minutes < 0) minutes = 0;
  } else {
    minutes = expiryMinutes;
  }

  // Use raw SQL with NOW() + INTERVAL to ensure correct UTC handling
  // Use make_interval to properly create an interval from minutes
  const result = await queryClient`
    INSERT INTO verification_codes (email, code, attempts, expires_at)
    VALUES (${email}, ${code}, 0, NOW() + make_interval(mins := ${minutes}))
    RETURNING id, email, code, attempts, expires_at, created_at
  `;

  return result;
}

export async function getVerificationCode(email: string) {
  const result = await db.select().from(verificationCodes).where(eq(verificationCodes.email, email)).orderBy(desc(verificationCodes.createdAt)).execute();
  return result[0] || null;
}

export async function deleteVerificationCode(email: string) {
  return db.delete(verificationCodes).where(eq(verificationCodes.email, email)).execute();
}

export async function incrementVerificationAttempts(email: string) {
  const code = await getVerificationCode(email);
  if (code) {
    return db.update(verificationCodes).set({ attempts: code.attempts + 1 }).where(eq(verificationCodes.id, code.id)).execute();
  }
}

export async function createEmailVerification(userId: number, email: string) {
  return db.insert(emailVerifications).values({ userId, email }).execute();
}

export async function getEmailVerification(email: string) {
  const result = await db.select().from(emailVerifications).where(eq(emailVerifications.email, email)).execute();
  return result[0] || null;
}

// ============ WALLET QUERIES ============
export async function createWallet(userId: number, address: string, privateKey: string = "", chainId = 11155111) {
  // Encrypt the private key if provided
  let encryptedData = { encrypted: "", iv: "", authTag: "" };
  
  if (privateKey) {
    const encryptionKey = ENV.encryptKey;
    encryptedData = encrypt(privateKey, encryptionKey);
  }
  
  return db.insert(wallets).values({
    userId,
    address,
    chainId,
    encryptedPrivateKey: encryptedData.encrypted,
    privateKeyIv: encryptedData.iv,
    privateKeyAuthTag: encryptedData.authTag,
  }).execute();
}

export async function getWalletByUserId(userId: number) {
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).execute();
  if (!result[0]) return null;
  
  const wallet = result[0];
  // Decrypt private key if it exists
  if (wallet.encryptedPrivateKey && wallet.privateKeyIv && wallet.privateKeyAuthTag) {
    try {
      const encryptionKey = ENV.encryptKey;
      const decrypted = decrypt({
        encrypted: wallet.encryptedPrivateKey,
        iv: wallet.privateKeyIv,
        authTag: wallet.privateKeyAuthTag,
      }, encryptionKey);
      return { ...wallet, privateKey: decrypted };
    } catch (error) {
      console.error("[DB] Error decrypting private key:", error);
      return wallet;
    }
  }
  
  return wallet;
}

export async function getWalletByAddress(address: string) {
  const result = await db.select().from(wallets).where(eq(wallets.address, address)).execute();
  if (!result[0]) return null;
  
  const wallet = result[0];
  // Decrypt private key if it exists
  if (wallet.encryptedPrivateKey && wallet.privateKeyIv && wallet.privateKeyAuthTag) {
    try {
      const encryptionKey = ENV.encryptKey;
      const decrypted = decrypt({
        encrypted: wallet.encryptedPrivateKey,
        iv: wallet.privateKeyIv,
        authTag: wallet.privateKeyAuthTag,
      }, encryptionKey);
      return { ...wallet, privateKey: decrypted };
    } catch (error) {
      console.error("[DB] Error decrypting private key:", error);
      return wallet;
    }
  }
  
  return wallet;
}

// ============ MINT REQUEST QUERIES ============
export async function createMintRequest(
  requestId: string,
  userId: number,
  email: string,
  signature: string,
  amount: number,
  requiredEthWei: string,
  expiryMinutes: number,
  morseChallenge: string,
) {
  const result = await queryClient`
    INSERT INTO mint_requests (id, user_id, email, signature, status, amount, required_eth_wei, morse_challenge, expires_at)
    VALUES (${requestId}, ${userId}, ${email}, ${signature}, 'pending', ${amount}, ${requiredEthWei}, ${morseChallenge}, NOW() + make_interval(mins := ${expiryMinutes}))
    RETURNING id, user_id, email, signature, status, amount, required_eth_wei, morse_challenge, expires_at, created_at
  `;

  return result;
}

export async function getMintRequest(requestId: string) {
  const result = await db.select().from(mintRequests).where(eq(mintRequests.id, requestId)).execute();
  return result[0] || null;
}

export async function getMintRequestsByUserId(userId: number, limit = 10) {
  return db.select().from(mintRequests).where(eq(mintRequests.userId, userId)).orderBy(desc(mintRequests.createdAt)).limit(limit).execute();
}

export async function getActiveMintRequestByUserId(userId: number) {
  const now = new Date();
  const result = await db
    .select()
    .from(mintRequests)
    .where(
      and(
        eq(mintRequests.userId, userId),
        inArray(mintRequests.status, ["pending", "paid", "swept"]),
        gt(mintRequests.expiresAt, now),
      ),
    )
    .orderBy(mintRequests.createdAt)
    .limit(1)
    .execute();
  return result[0] || null;
}

export async function countActiveMintRequestsByUserId(userId: number) {
  const now = new Date();
  const result = await db
    .select()
    .from(mintRequests)
    .where(
      and(
        eq(mintRequests.userId, userId),
        inArray(mintRequests.status, ["pending", "paid", "swept", "minting"]),
        gt(mintRequests.expiresAt, now),
      ),
    )
    .execute();
  return result.length;
}

// Sum of tokens already minted (and tokens currently in-flight that may still mint) per email.
// We count terminal `minted` PLUS any in-flight statuses where ETH has been or is being deducted
// (`paid`, `swept`, `minting`) so concurrent requests cannot collectively exceed the cap.
export async function getCommittedTokensByEmail(email: string): Promise<number> {
  const normalized = email.toLowerCase().trim();
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${mintRequests.amount}), 0)` })
    .from(mintRequests)
    .where(
      and(
        eq(mintRequests.email, normalized),
        inArray(mintRequests.status, ["paid", "swept", "minting", "minted"]),
      ),
    )
    .execute();
  return Number(result[0]?.total ?? 0);
}

export async function getMintRequestByEmailMessageId(messageId: string) {
  const result = await db
    .select()
    .from(mintRequests)
    .where(eq(mintRequests.emailMessageId, messageId))
    .execute();
  return result[0] || null;
}

// Atomically record the email message ID against a pre-sweep request where the message ID
// slot is empty and email is not yet verified. Returns the updated row or null on race loss.
// Accepts both `pending` (not yet paid) and `paid` (paid but not yet swept) — verification
// before sweep gates ETH deduction.
export async function markEmailVerifiedWithMessageId(requestId: string, messageId: string) {
  const result = await db
    .update(mintRequests)
    .set({ emailVerified: true, emailMessageId: messageId })
    .where(
      and(
        eq(mintRequests.id, requestId),
        inArray(mintRequests.status, ["pending", "paid"]),
        eq(mintRequests.emailVerified, false),
        sql`${mintRequests.emailMessageId} IS NULL`,
      ),
    )
    .returning();
  return result[0] || null;
}

export async function getRequestsByStatus(status: string) {
  return db
    .select()
    .from(mintRequests)
    .where(eq(mintRequests.status, status))
    .orderBy(mintRequests.createdAt)
    .execute();
}

export async function updateMintRequestStatus(requestId: string, status: string) {
  return db.update(mintRequests).set({ status }).where(eq(mintRequests.id, requestId)).execute();
}

export async function setSweepTxHash(requestId: string, sweepTxHash: string) {
  return db
    .update(mintRequests)
    .set({ sweepTxHash })
    .where(and(eq(mintRequests.id, requestId), eq(mintRequests.status, "paid")))
    .execute();
}

/**
 * Atomically transition status from one state to another. Returns the updated row,
 * or null if the request was not in `fromStatus` (lost the FCFS race).
 */
export async function transitionMintRequestStatus(
  requestId: string,
  fromStatus: string,
  toStatus: string,
  extra: Partial<typeof mintRequests.$inferInsert> = {},
) {
  const result = await db
    .update(mintRequests)
    .set({ status: toStatus, ...extra })
    .where(and(eq(mintRequests.id, requestId), eq(mintRequests.status, fromStatus)))
    .returning();
  return result[0] || null;
}

export async function markRequestExpired(requestId: string) {
  return queryClient`
    UPDATE mint_requests
    SET status = 'expired'
    WHERE id = ${requestId} AND status = 'pending' AND expires_at < NOW()
  `;
}

export async function markEmailVerified(requestId: string) {
  return db
    .update(mintRequests)
    .set({ emailVerified: true })
    .where(eq(mintRequests.id, requestId))
    .execute();
}

// ============ TRANSACTION QUERIES ============
export async function createTransaction(requestId: string, txHash: string, kind: string = "mint") {
  return db.insert(transactions).values({ requestId, txHash, kind }).execute();
}

export async function getTransactionsByUserId(userId: number, limit = 20) {
  return db.select().from(transactions).limit(limit).execute();
}
