import { pgTable, serial, text, varchar, timestamp, integer, pgEnum, boolean } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSignedIn: timestamp("last_signed_in").notNull().defaultNow(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: varchar("address", { length: 42 }).notNull().unique(),
  chainId: integer("chain_id").notNull().default(11155111),
  encryptedPrivateKey: text("encrypted_private_key").notNull().default(""),
  privateKeyIv: varchar("private_key_iv", { length: 32 }).notNull().default(""),
  privateKeyAuthTag: varchar("private_key_auth_tag", { length: 32 }).notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mintRequests = pgTable("mint_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  email: varchar("email", { length: 320 }).notNull(),
  signature: text("signature").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  amount: integer("amount").notNull().default(10000),
  requiredEthWei: varchar("required_eth_wei", { length: 78 }).notNull().default("0"),
  paymentTxHash: varchar("payment_tx_hash", { length: 66 }),
  sweepTxHash: varchar("sweep_tx_hash", { length: 66 }),
  mintTxHash: varchar("mint_tx_hash", { length: 66 }),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailMessageId: varchar("email_message_id", { length: 255 }),
  morseChallenge: varchar("morse_challenge", { length: 32 }),
  failureReason: text("failure_reason"),
  expiresAt: timestamp("expires_at").notNull(),
  paidAt: timestamp("paid_at"),
  sweptAt: timestamp("swept_at"),
  mintedAt: timestamp("minted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 64 }).notNull().references(() => mintRequests.id),
  txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
  kind: varchar("kind", { length: 16 }).notNull().default("mint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
