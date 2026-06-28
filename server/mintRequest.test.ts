import { describe, it, expect } from "vitest";
import {
  generateMintSignature,
  generateMintRequestId,
  calculateMintExpiry,
  verifyMintSignature,
  isMintRequestExpired,
  generateMintPromptContent,
} from "./mintRequest";

describe("Mint Request Utilities", () => {
  const testData = {
    userId: 1,
    email: "test@example.com",
    chainId: 1,
    amount: 10000,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  const secret = "test-secret-key";

  describe("generateMintSignature", () => {
    it("should generate a valid hex signature", () => {
      const signature = generateMintSignature(testData, secret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA256 is 64 hex chars
    });

    it("should generate consistent signatures for same data", () => {
      const sig1 = generateMintSignature(testData, secret);
      const sig2 = generateMintSignature(testData, secret);
      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different data", () => {
      const sig1 = generateMintSignature(testData, secret);
      const sig2 = generateMintSignature({ ...testData, userId: 2 }, secret);
      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const sig1 = generateMintSignature(testData, secret);
      const sig2 = generateMintSignature(testData, "different-secret");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("generateMintRequestId", () => {
    it("should generate a valid request ID", () => {
      const id = generateMintRequestId();
      expect(id).toMatch(/^mint_[a-zA-Z0-9_-]{32}$/);
    });

    it("should generate unique IDs", () => {
      const id1 = generateMintRequestId();
      const id2 = generateMintRequestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("calculateMintExpiry", () => {
    it("should calculate expiry 5 minutes from now by default", () => {
      const expiry = calculateMintExpiry();
      const now = Date.now();
      const diff = expiry.getTime() - now;
      // Should be approximately 5 minutes (300000ms), allow 1 second tolerance
      expect(diff).toBeGreaterThan(299000);
      expect(diff).toBeLessThan(301000);
    });

    it("should calculate expiry with custom minutes", () => {
      const expiry = calculateMintExpiry(10);
      const now = Date.now();
      const diff = expiry.getTime() - now;
      // Should be approximately 10 minutes (600000ms)
      expect(diff).toBeGreaterThan(599000);
      expect(diff).toBeLessThan(601000);
    });
  });

  describe("verifyMintSignature", () => {
    it("should verify valid signatures", () => {
      const signature = generateMintSignature(testData, secret);
      const isValid = verifyMintSignature(testData, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signatures", () => {
      const isValid = verifyMintSignature(testData, "invalid-signature", secret);
      expect(isValid).toBe(false);
    });

    it("should reject signatures with wrong secret", () => {
      const signature = generateMintSignature(testData, secret);
      const isValid = verifyMintSignature(testData, signature, "wrong-secret");
      expect(isValid).toBe(false);
    });

    it("should reject signatures with modified data", () => {
      const signature = generateMintSignature(testData, secret);
      const modifiedData = { ...testData, userId: 999 };
      const isValid = verifyMintSignature(modifiedData, signature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe("isMintRequestExpired", () => {
    it("should return false for future dates", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      expect(isMintRequestExpired(futureDate)).toBe(false);
    });

    it("should return true for past dates", () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      expect(isMintRequestExpired(pastDate)).toBe(true);
    });
  });

  describe("generateMintPromptContent", () => {
    it("should generate valid email content", () => {
      const content = generateMintPromptContent(
        "mint_test123",
        "sig_abc123",
        "test@example.com",
        "0x1234567890123456789012345678901234567890"
      );

      expect(content).toContain("Mint Request");
      expect(content).toContain("mint_test123");
      expect(content).toContain("sig_abc123");
      expect(content).toContain("test@example.com");
      expect(content).toContain("0x1234567890123456789012345678901234567890");
      expect(content).toContain("10,000 tokens");
      expect(content).toContain("Sepolia");
    });

    it("should include expiry information", () => {
      const content = generateMintPromptContent(
        "mint_test123",
        "sig_abc123",
        "test@example.com",
        "0x1234567890123456789012345678901234567890"
      );

      expect(content).toContain("5 minutes");
    });
  });
});
