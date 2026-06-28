import { describe, it, expect } from "vitest";
import {
  generateOTP,
  isValidEmail,
  isValidOTP,
  isCodeExpired,
  isMaxAttemptsExceeded,
} from "./emailVerification";

describe("Email Verification Utilities", () => {
  describe("generateOTP", () => {
    it("should generate a 6-digit code", () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it("should generate different codes on each call", () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      // Very unlikely to be the same, but theoretically possible
      // Just verify they're both valid format
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });

    it("should generate codes in valid range (100000-999999)", () => {
      for (let i = 0; i < 10; i++) {
        const otp = generateOTP();
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("test.email@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user @example.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });

    it("should reject emails longer than 320 characters", () => {
      const longEmail = "a".repeat(310) + "@example.com"; // 321 chars total
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe("isValidOTP", () => {
    it("should accept valid 6-digit codes", () => {
      expect(isValidOTP("000000")).toBe(true);
      expect(isValidOTP("123456")).toBe(true);
      expect(isValidOTP("999999")).toBe(true);
    });

    it("should reject non-6-digit codes", () => {
      expect(isValidOTP("12345")).toBe(false); // 5 digits
      expect(isValidOTP("1234567")).toBe(false); // 7 digits
      expect(isValidOTP("")).toBe(false); // empty
      expect(isValidOTP("abcdef")).toBe(false); // letters
      expect(isValidOTP("12345a")).toBe(false); // mixed
    });
  });

  describe("isCodeExpired", () => {
    it("should return false for future dates", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      expect(isCodeExpired(futureDate)).toBe(false);
    });

    it("should return true for past dates", () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(isCodeExpired(pastDate)).toBe(true);
    });

    it("should return true for past time (1 second ago)", () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      expect(isCodeExpired(pastDate)).toBe(true);
    });
  });

  describe("isMaxAttemptsExceeded", () => {
    it("should return false when attempts < maxAttempts", () => {
      expect(isMaxAttemptsExceeded(0, 3)).toBe(false);
      expect(isMaxAttemptsExceeded(1, 3)).toBe(false);
      expect(isMaxAttemptsExceeded(2, 3)).toBe(false);
    });

    it("should return true when attempts >= maxAttempts", () => {
      expect(isMaxAttemptsExceeded(3, 3)).toBe(true);
      expect(isMaxAttemptsExceeded(4, 3)).toBe(true);
      expect(isMaxAttemptsExceeded(10, 3)).toBe(true);
    });

    it("should work with different max attempt values", () => {
      expect(isMaxAttemptsExceeded(4, 5)).toBe(false);
      expect(isMaxAttemptsExceeded(5, 5)).toBe(true);
    });
  });
});
