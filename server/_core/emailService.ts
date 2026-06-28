/**
 * Email Service Module
 * Handles all email sending operations with retry logic and error handling
 */

import { sendEmail, getEmailTransporter } from "./emailConfig";
import {
  getOTPEmailTemplate,
  getMintRequestNotificationTemplate,
  getTransactionConfirmationTemplate,
} from "./emailTemplates";

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(
  email: string,
  code: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const template = getOTPEmailTemplate(email, code);

      const result = await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.success) {
        console.log(`[Email Service] OTP email sent successfully to ${email}`);
        return { success: true };
      } else {
        lastError = result.error;
        console.warn(`[Email Service] OTP email failed (attempt ${attempt}/${maxRetries}):`, result.error);

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[Email Service] OTP email error (attempt ${attempt}/${maxRetries}):`, lastError);

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed to send OTP email after multiple attempts",
  };
}

/**
 * Send mint request notification to owner
 */
export async function sendMintRequestNotification(
  ownerEmail: string,
  userEmail: string,
  userId: number,
  requestId: string,
  amount: number,
  chainId: number,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const template = getMintRequestNotificationTemplate(ownerEmail, userEmail, userId, requestId, amount, chainId);

      const result = await sendEmail({
        to: ownerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: userEmail,
      });

      if (result.success) {
        console.log(`[Email Service] Mint request notification sent to ${ownerEmail}`);
        return { success: true };
      } else {
        lastError = result.error;
        console.warn(
          `[Email Service] Mint notification failed (attempt ${attempt}/${maxRetries}):`,
          result.error
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(
        `[Email Service] Mint notification error (attempt ${attempt}/${maxRetries}):`,
        lastError
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed to send mint notification after multiple attempts",
  };
}

/**
 * Send transaction confirmation email to user
 */
export async function sendTransactionConfirmation(
  userEmail: string,
  amount: number,
  txHash: string,
  chainId: number,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const template = getTransactionConfirmationTemplate(userEmail, amount, txHash, chainId);

      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.success) {
        console.log(`[Email Service] Transaction confirmation sent to ${userEmail}`);
        return { success: true };
      } else {
        lastError = result.error;
        console.warn(
          `[Email Service] Transaction confirmation failed (attempt ${attempt}/${maxRetries}):`,
          result.error
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(
        `[Email Service] Transaction confirmation error (attempt ${attempt}/${maxRetries}):`,
        lastError
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed to send transaction confirmation after multiple attempts",
  };
}

/**
 * Initialize email service on startup
 */
export async function initializeEmailServiceOnStartup(): Promise<void> {
  try {
    const transporter = await getEmailTransporter();
    if (transporter) {
      console.log("[Email Service] Email service initialized successfully");
    } else {
      console.warn("[Email Service] Email service running in development mode");
    }
  } catch (error) {
    console.error("[Email Service] Failed to initialize email service:", error);
    // Don't throw - allow app to continue in development mode
  }
}
