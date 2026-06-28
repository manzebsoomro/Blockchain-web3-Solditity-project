/**
 * Email service for sending mint prompts
 * This is a placeholder implementation that logs emails
 * In production, integrate with SendGrid, Mailgun, or similar
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email with mint prompt
 * TODO: Replace with actual email service (SendGrid, Mailgun, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    const { to, subject, text } = options;

    // Validate email
    if (!to || !to.includes("@")) {
      return {
        success: false,
        error: "Invalid recipient email",
      };
    }

    // TODO: Integrate with actual email service
    // For now, log to console
    console.log(`[Email Service] Sending email to ${to}`);
    console.log(`[Email Service] Subject: ${subject}`);
    console.log(`[Email Service] Body:\n${text}`);

    // Generate a mock message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("[Email Service] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send mint prompt email
 */
export async function sendMintPromptEmail(
  email: string,
  requestId: string,
  signature: string,
  walletAddress: string,
  promptContent: string
): Promise<SendEmailResult> {
  const subject = `Mint Request - ${requestId}`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #38c7b4;">Mint Request Confirmation</h2>
          
          <p>Hello,</p>
          
          <p>This is your mint request confirmation. Please keep this email for your records.</p>
          
          <h3>Request Details:</h3>
          <ul>
            <li><strong>Request ID:</strong> <code>${requestId}</code></li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Wallet Address:</strong> <code>${walletAddress}</code></li>
            <li><strong>Chain:</strong> Ethereum</li>
            <li><strong>Amount:</strong> 10,000 tokens</li>
            <li><strong>Signature:</strong> <code>${signature.substring(0, 32)}...</code></li>
          </ul>
          
          <p style="color: #666; font-size: 14px;">
            <strong>⏱️ This request will expire in 5 minutes.</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Do not reply to this email. If you did not request this, please ignore this message.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    text: promptContent,
    html: htmlContent,
  });
}

/**
 * Send transaction confirmation email
 */
export async function sendTransactionConfirmationEmail(
  email: string,
  txHash: string,
  amount: number,
  walletAddress: string
): Promise<SendEmailResult> {
  const subject = `Transaction Confirmed - ${amount} Tokens Minted`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #38c7b4;">✅ Tokens Minted Successfully</h2>
          
          <p>Hello,</p>
          
          <p>Your mint request has been processed successfully!</p>
          
          <h3>Transaction Details:</h3>
          <ul>
            <li><strong>Amount:</strong> ${amount.toLocaleString()} tokens</li>
            <li><strong>Wallet:</strong> <code>${walletAddress}</code></li>
            <li><strong>Transaction Hash:</strong> <code>${txHash}</code></li>
            <li><strong>Network:</strong> Ethereum Mainnet</li>
          </ul>
          
          <p>
            <a href="https://etherscan.io/tx/${txHash}" style="color: #38c7b4; text-decoration: none;">
              View on Etherscan →
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Thank you for participating in the mint experiment!
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    text: `Your ${amount} tokens have been minted successfully. Transaction: ${txHash}`,
    html: htmlContent,
  });
}
