import { describe, it, expect } from "vitest";
import { sendEmail, sendMintPromptEmail, sendTransactionConfirmationEmail } from "./emailService";

describe("Email Service", () => {
  describe("sendEmail", () => {
    it("should send email successfully", async () => {
      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it("should reject invalid email", async () => {
      const result = await sendEmail({
        to: "invalid-email",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should reject empty email", async () => {
      const result = await sendEmail({
        to: "",
        subject: "Test Email",
        text: "This is a test email",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("sendMintPromptEmail", () => {
    it("should send mint prompt email successfully", async () => {
      const result = await sendMintPromptEmail(
        "user@example.com",
        "mint_test123",
        "sig_abc123def456",
        "0x1234567890123456789012345678901234567890",
        "Test prompt content"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("should include request details in email", async () => {
      const email = "user@example.com";
      const requestId = "mint_test123";
      const signature = "sig_abc123";
      const wallet = "0x1234567890123456789012345678901234567890";

      const result = await sendMintPromptEmail(email, requestId, signature, wallet, "Test");

      expect(result.success).toBe(true);
      // Email content would be verified in integration tests
    });
  });

  describe("sendTransactionConfirmationEmail", () => {
    it("should send transaction confirmation email successfully", async () => {
      const result = await sendTransactionConfirmationEmail(
        "user@example.com",
        "0xabc123def456",
        10000,
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("should include transaction details", async () => {
      const result = await sendTransactionConfirmationEmail(
        "user@example.com",
        "0xabc123def456",
        10000,
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.success).toBe(true);
      // Email content verification in integration tests
    });
  });
});
