/**
 * Email templates for various notifications
 */

/**
 * OTP verification email template
 */
export function getOTPEmailTemplate(email: string, code: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your Mint Experiment Verification Code";

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        background: #f9fafb;
        border-radius: 8px;
        padding: 40px 30px;
        text-align: center;
      }
      .header {
        margin-bottom: 30px;
      }
      .logo {
        font-size: 28px;
        font-weight: bold;
        color: #0ea5e9;
        margin-bottom: 10px;
      }
      .title {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
        margin: 20px 0;
      }
      .description {
        color: #6b7280;
        margin: 15px 0;
        font-size: 16px;
      }
      .code-box {
        background: white;
        border: 2px solid #0ea5e9;
        border-radius: 8px;
        padding: 20px;
        margin: 30px 0;
      }
      .code {
        font-size: 36px;
        font-weight: bold;
        color: #0ea5e9;
        letter-spacing: 4px;
        font-family: 'Courier New', monospace;
      }
      .code-expiry {
        color: #6b7280;
        font-size: 14px;
        margin-top: 10px;
      }
      .warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 15px;
        margin: 20px 0;
        text-align: left;
        border-radius: 4px;
        font-size: 14px;
        color: #92400e;
      }
      .footer {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
      .link {
        color: #0ea5e9;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">🪙 Mint Experiment</div>
      </div>

      <div class="title">Verify Your Email</div>
      <p class="description">Use the code below to verify your email and access the mint experiment.</p>

      <div class="code-box">
        <div class="code">${code}</div>
        <div class="code-expiry">This code expires in 10 minutes</div>
      </div>

      <div class="warning">
        <strong>⚠️ Security Notice:</strong> Never share this code with anyone. We will never ask for this code via email or phone.
      </div>

      <p class="description">
        If you didn't request this code, please ignore this email or <a href="mailto:support@example.com" class="link">contact support</a>.
      </p>

      <div class="footer">
        <p>© 2026 Mint Experiment. All rights reserved.</p>
        <p>
          Questions? <a href="mailto:support@example.com" class="link">Contact Support</a>
        </p>
      </div>
    </div>
  </body>
</html>
  `;

  const text = `
Mint Experiment - Email Verification

Your verification code is: ${code}

This code expires in 10 minutes.

⚠️ Security Notice: Never share this code with anyone. We will never ask for this code via email or phone.

If you didn't request this code, please ignore this email or contact support@example.com.

© 2026 Mint Experiment. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Mint request notification email template (for owner)
 */
export function getMintRequestNotificationTemplate(
  ownerEmail: string,
  userEmail: string,
  userId: number,
  requestId: string,
  amount: number,
  chainId: number
): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `New Mint Request from ${userEmail}`;
  const chainName = chainId === 1 ? "Ethereum Mainnet" : `Chain ${chainId}`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        background: #f9fafb;
        border-radius: 8px;
        padding: 40px 30px;
      }
      .header {
        margin-bottom: 30px;
      }
      .logo {
        font-size: 28px;
        font-weight: bold;
        color: #0ea5e9;
        margin-bottom: 10px;
      }
      .title {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
        margin: 20px 0;
      }
      .details {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        color: #6b7280;
        font-weight: 500;
      }
      .detail-value {
        color: #1f2937;
        font-weight: 600;
      }
      .action-button {
        display: inline-block;
        background: #0ea5e9;
        color: white;
        padding: 12px 30px;
        border-radius: 6px;
        text-decoration: none;
        margin: 20px 0;
        font-weight: 600;
      }
      .action-button:hover {
        background: #0284c7;
      }
      .footer {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">🪙 Mint Experiment</div>
      </div>

      <div class="title">New Mint Request Received</div>
      <p>A new mint request has been submitted. Here are the details:</p>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">User Email:</span>
          <span class="detail-value">${userEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">User ID:</span>
          <span class="detail-value">${userId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Request ID:</span>
          <span class="detail-value">${requestId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${amount.toLocaleString()} tokens</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Network:</span>
          <span class="detail-value">${chainName}</span>
        </div>
      </div>

      <p>Please review this request and take appropriate action.</p>

      <div class="footer">
        <p>© 2026 Mint Experiment. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
  `;

  const text = `
Mint Experiment - New Mint Request

A new mint request has been submitted:

User Email: ${userEmail}
User ID: ${userId}
Request ID: ${requestId}
Amount: ${amount.toLocaleString()} tokens
Network: ${chainName}

Please review this request and take appropriate action.

© 2026 Mint Experiment. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Transaction confirmation email template (for user)
 */
export function getTransactionConfirmationTemplate(
  userEmail: string,
  amount: number,
  txHash: string,
  chainId: number
): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Transaction Confirmed - Tokens Minted";
  const chainName = chainId === 1 ? "Ethereum Mainnet" : `Chain ${chainId}`;
  const explorerUrl = chainId === 1 ? `https://etherscan.io/tx/${txHash}` : `#`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        background: #f9fafb;
        border-radius: 8px;
        padding: 40px 30px;
        text-align: center;
      }
      .success-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      .title {
        font-size: 24px;
        font-weight: 600;
        color: #10b981;
        margin: 20px 0;
      }
      .amount {
        font-size: 32px;
        font-weight: bold;
        color: #0ea5e9;
        margin: 20px 0;
      }
      .details {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        text-align: left;
      }
      .detail-row {
        padding: 10px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        color: #6b7280;
        font-size: 14px;
      }
      .detail-value {
        color: #1f2937;
        font-weight: 600;
        word-break: break-all;
      }
      .link {
        color: #0ea5e9;
        text-decoration: none;
      }
      .footer {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="success-icon">✅</div>
      <div class="title">Transaction Confirmed!</div>
      <p>Your tokens have been successfully minted.</p>

      <div class="amount">${amount.toLocaleString()} Tokens</div>

      <div class="details">
        <div class="detail-row">
          <div class="detail-label">Transaction Hash:</div>
          <div class="detail-value">${txHash}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Network:</div>
          <div class="detail-value">${chainName}</div>
        </div>
      </div>

      <p>
        <a href="${explorerUrl}" class="link">View on Block Explorer</a>
      </p>

      <div class="footer">
        <p>© 2026 Mint Experiment. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
  `;

  const text = `
Mint Experiment - Transaction Confirmed

Your transaction has been confirmed!

Amount: ${amount.toLocaleString()} tokens
Transaction Hash: ${txHash}
Network: ${chainName}

View on Block Explorer: ${explorerUrl}

© 2026 Mint Experiment. All rights reserved.
  `;

  return { subject, html, text };
}
