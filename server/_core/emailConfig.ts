import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Email service configuration
 * Supports SendGrid, Mailgun, and SMTP
 */

export type EmailProvider = "sendgrid" | "mailgun" | "smtp" | "development";

interface EmailConfig {
  provider: EmailProvider;
  fromAddress: string;
  fromName?: string;
}

let transporter: Transporter | null = null;

/**
 * Initialize email transporter based on environment configuration
 */
export async function initializeEmailService(): Promise<Transporter | null> {
  if (transporter) {
    return transporter;
  }

  const provider = (process.env.EMAIL_SERVICE_PROVIDER || (process.env.EMAIL_USER && process.env.EMAIL_PASS ? "smtp" : "development")) as EmailProvider;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || "noreply@example.com";
  const fromName = process.env.EMAIL_FROM_NAME || "Mint Experiment";

  console.log(`[Email Service] Initializing with provider: ${provider}`);

  try {
    switch (provider) {
      case "sendgrid": {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
          throw new Error("SENDGRID_API_KEY environment variable is required");
        }

        transporter = nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          auth: {
            user: "apikey",
            pass: apiKey,
          },
        });
        break;
      }

      case "mailgun": {
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        if (!apiKey || !domain) {
          throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables are required");
        }

        transporter = nodemailer.createTransport({
          host: `smtp.mailgun.org`,
          port: 587,
          auth: {
            user: `postmaster@${domain}`,
            pass: apiKey,
          },
        });
        break;
      }

      case "smtp": {
        const host = process.env.SMTP_HOST || "smtp.gmail.com";
        const port = parseInt(process.env.SMTP_PORT || "465");
        const user = process.env.SMTP_USER || process.env.EMAIL_USER;
        const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

        if (!user || !pass) {
          throw new Error("SMTP_USER and SMTP_PASSWORD, or EMAIL_USER and EMAIL_PASS, are required");
        }

        transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
        });
        break;
      }

      case "development": {
        // Development mode: log emails to console instead of sending
        console.log("[Email Service] Running in development mode - emails will be logged to console");
        transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: "unix",
          buffer: true,
        });
        break;
      }

      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }

    // Verify connection
    if (provider !== "development") {
      await transporter.verify();
      console.log("[Email Service] Email service connected successfully");
    }

    return transporter;
  } catch (error) {
    console.error("[Email Service] Failed to initialize:", error);
    if (provider !== "development") {
      throw error;
    }
    return null;
  }
}

/**
 * Get the email transporter instance
 */
export async function getEmailTransporter(): Promise<Transporter | null> {
  if (!transporter) {
    return initializeEmailService();
  }
  return transporter;
}

/**
 * Send an email
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = await getEmailTransporter();
    if (!transporter) {
      throw new Error("Email service not initialized");
    }

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || "noreply@example.com";
    const fromName = process.env.EMAIL_FROM_NAME || "Mint Experiment";

    const info = await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      html: options.html,
      replyTo: options.replyTo,
    });

    // In development mode, log the email
    if (process.env.EMAIL_SERVICE_PROVIDER === "development" || !process.env.EMAIL_SERVICE_PROVIDER) {
      console.log("[Email Service] Email sent in development mode:");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      if (info.message) {
        console.log(`  Content:\n${info.message}`);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Email Service] Failed to send email:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test email service connection
 */
export async function testEmailService(): Promise<boolean> {
  try {
    const transporter = await getEmailTransporter();
    if (!transporter) {
      console.warn("[Email Service] Email service not initialized");
      return false;
    }

    if (process.env.EMAIL_SERVICE_PROVIDER === "development" || !process.env.EMAIL_SERVICE_PROVIDER) {
      console.log("[Email Service] Development mode - test passed");
      return true;
    }

    await transporter.verify();
    console.log("[Email Service] Test passed");
    return true;
  } catch (error) {
    console.error("[Email Service] Test failed:", error);
    return false;
  }
}
