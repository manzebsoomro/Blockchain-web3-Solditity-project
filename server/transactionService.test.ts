import { describe, it, expect } from "vitest";
import {
  executeMintTransaction,
  checkTransactionStatus,
  getWalletTransactionHistory,
  estimateTransactionFee,
} from "./transactionService";

describe("Transaction Service", () => {
  const validWallet = "0x1234567890123456789012345678901234567890";

  describe("executeMintTransaction", () => {
    it("should execute mint transaction successfully", async () => {
      const result = await executeMintTransaction(validWallet, 10000, "mint_test123");

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.data).toBeDefined();
      expect(result.data?.amount).toBe(10000);
      expect(result.data?.to).toBe(validWallet);
      expect(result.data?.status).toBe("pending");
    });

    it("should reject invalid wallet address", async () => {
      const result = await executeMintTransaction("invalid-address", 10000, "mint_test123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid wallet");
    });

    it("should reject zero or negative amount", async () => {
      const result = await executeMintTransaction(validWallet, 0, "mint_test123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid mint amount");
    });

    it("should reject negative amount", async () => {
      const result = await executeMintTransaction(validWallet, -1000, "mint_test123");

      expect(result.success).toBe(false);
    });
  });

  describe("checkTransactionStatus", () => {
    it("should check transaction status successfully", async () => {
      const txHash = "0xabc123def456789abc123def456789abc123def456789abc123def456789abc1";
      const result = await checkTransactionStatus(txHash);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(txHash);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe("pending");
    });

    it("should reject invalid transaction hash", async () => {
      const result = await checkTransactionStatus("invalid-hash");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid transaction hash");
    });

    it("should reject transaction hash without 0x prefix", async () => {
      const result = await checkTransactionStatus("abc123def456");

      expect(result.success).toBe(false);
    });
  });

  describe("getWalletTransactionHistory", () => {
    it("should fetch wallet transaction history", async () => {
      const result = await getWalletTransactionHistory(validWallet, 10);

      expect(Array.isArray(result)).toBe(true);
      // Mock returns empty array for now
      expect(result.length).toBe(0);
    });

    it("should reject invalid wallet address", async () => {
      const result = await getWalletTransactionHistory("invalid-address", 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should use default limit of 10", async () => {
      const result = await getWalletTransactionHistory(validWallet);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("estimateTransactionFee", () => {
    it("should estimate transaction fee successfully", async () => {
      const result = await estimateTransactionFee(10000);

      expect(result.gasPrice).toBeDefined();
      expect(result.estimatedFee).toBeDefined();
      expect(parseFloat(result.gasPrice)).toBeGreaterThan(0);
      expect(parseFloat(result.estimatedFee)).toBeGreaterThan(0);
    });

    it("should handle zero amount", async () => {
      const result = await estimateTransactionFee(0);

      expect(result.gasPrice).toBeDefined();
      expect(result.estimatedFee).toBeDefined();
    });

    it("should handle large amounts", async () => {
      const result = await estimateTransactionFee(1000000);

      expect(result.gasPrice).toBeDefined();
      expect(result.estimatedFee).toBeDefined();
    });
  });
});
