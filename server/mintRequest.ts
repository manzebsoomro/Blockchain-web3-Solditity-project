import { createHmac, randomInt } from "crypto";
import { nanoid } from "nanoid";

interface MintRequestData {
  userId: number;
  email: string;
  chainId: number;
  amount: number;
  requiredEthWei: string;
  expiresAt: Date;
}

export function generateMintSignature(data: MintRequestData, secret: string): string {
  const payload = JSON.stringify({
    userId: data.userId,
    email: data.email,
    chainId: data.chainId,
    amount: data.amount,
    requiredEthWei: data.requiredEthWei,
    expiresAt: data.expiresAt.getTime(),
  });

  return createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Generate a unique mint request ID
 */
export function generateMintRequestId(): string {
  return `mint_${nanoid(32)}`;
}

/**
 * Generate a short morse-only verification challenge. The challenge MUST never appear in
 * cleartext in the prompt body — only as morse — so successfully replying with the plaintext
 * proves the user decoded the morse. Uppercase A-Z + 0-9 only (morse alphabet).
 */
export function generateMorseChallenge(length = 8): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[randomInt(0, alphabet.length)];
  }
  return out;
}

/**
 * Calculate expiry time (5 minutes from now)
 */
export function calculateMintExpiry(minutesFromNow = 5): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

/**
 * Verify a mint request signature
 */
export function verifyMintSignature(data: MintRequestData, signature: string, secret: string): boolean {
  const expectedSignature = generateMintSignature(data, secret);
  return signature === expectedSignature;
}

export function isMintRequestExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function generateMintPromptContent(
  requestId: string,
  signature: string,
  email: string,
  walletAddress: string,
  tokenAmount: number,
  ethCost: string,
  mintInboxAddress: string,
): string {
  // NOTE: This template intentionally does NOT include the morse challenge in plaintext;
  // the morse-encoded line is generated and prepended by the caller (routers.ts). The
  // challenge appears in plaintext nowhere else.
  return `
Subject: Mint Request - ${requestId}

============================================================
HOW TO COMPLETE THIS MINT  —  follow all 3 steps in order
============================================================

STEP 1  —  Send payment
  Send AT LEAST ${ethCost} ETH PLUS a small gas buffer
  (about 0.0005 ETH extra is plenty) on the Sepolia network
  to your deposit wallet:

      ${walletAddress}

  Any wallet you control can be the sender. Payment is
  detected automatically within ~5 seconds of confirmation.

  Exactly ${ethCost} ETH will be deducted; the gas buffer
  covers the on-chain sweep. Any leftover stays in the
  deposit wallet and you can withdraw it later.

STEP 2  —  Decode the morse code
  At the very top of this email is a line that begins with:

      MORSE VERIFICATION CHALLENGE: ...

  Decode that morse string back to plain text. The result is
  an 8-character verification code (letters A–Z and digits).

STEP 3  —  Reply with the decoded code
  Reply to this email FROM ${email} (the same address you
  used to sign in) to:

      ${mintInboxAddress}

  Subject line: leave the default ("Re: Mint Request - ${requestId}")
  Body:        paste ONLY the decoded 8-character code on the
               first non-quoted line. Nothing else needed.

------------------------------------------------------------
Once all three are done, ${tokenAmount.toLocaleString()} tokens will be sent to
${walletAddress} on Sepolia.

Request Summary
  Tokens:          ${tokenAmount.toLocaleString()}
  Required ETH:    ${ethCost}
  Deposit wallet:  ${walletAddress}
  Sender email:    ${email}
  Chain:           Sepolia Testnet
  Signature:       ${signature}

Notes
  • This request expires in 10 minutes from generation.
  • If the deposit wallet does not hold ${ethCost} ETH plus a
    small gas buffer at expiry, the request will fail with
    "Insufficient balance" and no tokens will be minted.
  • Only ${ethCost} ETH is deducted from the deposit wallet;
    anything beyond that (minus gas) remains yours.
  • You can have up to 5 active mint requests at a time, and
    a lifetime total of 100,000 tokens per email.
`;
}
