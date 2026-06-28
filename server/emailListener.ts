import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import morse from "morse-node";
import dotenv from "dotenv";
import * as db from "./db";
import { logMintEvent } from "./_core/auditLog";

dotenv.config();

const morseTranslator = morse.create("ITU");

// Strict body parse: extract the FIRST non-empty, non-quoted line and require it to look
// like a morse-challenge plaintext (uppercase letters / digits, length 4-32). This prevents
// burying the answer in commentary text or HTML.
const CHALLENGE_REGEX = /^[A-Z0-9]{4,32}$/;

function extractChallengeFromBody(body: string): string | null {
  for (const rawLine of body.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    // Strip leading email-quote markers (">", ">>", etc.) and surrounding quotes.
    line = line.replace(/^[>\s]+/, "").trim();
    line = line.replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!line) continue;
    // Stop scanning once we hit a quoted reply block ("On <date>, ... wrote:").
    if (/^on .+wrote:?$/i.test(line)) return null;
    // Tolerate the user casing the reply lowercase.
    const candidate = line.toUpperCase();
    if (CHALLENGE_REGEX.test(candidate)) return candidate;
    // First non-quoted line wasn't a clean challenge — reject. This prevents burying a
    // valid answer in commentary.
    return null;
  }
  return null;
}

/**
 * Email Listener Service
 * Monitors the Gmail inbox for decoded morse code replies
 */
export async function startEmailListener() {
    const client = new ImapFlow({
        host: process.env.IMAP_HOST || "imap.gmail.com",
        port: parseInt(process.env.IMAP_PORT || "993"),
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        logger: false
    });

    console.log("[Email Listener] Starting listener for", process.env.EMAIL_USER);

    try {
        await client.connect();
        
        // Select the inbox
        let lock = await client.getMailboxLock("INBOX");
        try {
            // Monitor for new messages
            client.on("exists", async (data) => {
                console.log("[Email Listener] New message detected");
                await processNewEmails(client);
            });

            // Initial check
            await processNewEmails(client);
        } finally {
            lock.release();
        }
    } catch (err) {
        console.error("[Email Listener] Error:", err);
    }
}

async function processNewEmails(client: ImapFlow) {
    const NON_VERIFIABLE_STATUSES = new Set([
        "minted",
        "success",
        "failed",
        "expired",
        "mint_failed_refund_needed",
    ]);

    for await (let msg of client.fetch({ seen: false }, { source: true })) {
        let shouldMarkSeen = true;
        try {
            const parsed = await simpleParser(msg.source);
            const from = parsed.from?.value[0]?.address;
            // Parse only the plain-text body. Ignore HTML and attachments — strict parser
            // means a crafted HTML body or attachment cannot trigger verification.
            const body = (parsed.text || "").trim();
            const subject = parsed.subject || "";
            // Use the IMAP message-id when available — this is the unique identifier from
            // the SMTP envelope and is robust against replay.
            const messageId = parsed.messageId || `uid:${msg.uid}`;

            const requestIdMatch = subject.match(/mint_[a-zA-Z0-9_-]+/);
            const requestId = requestIdMatch ? requestIdMatch[0] : null;

            if (!requestId) {
                console.log(`[Email Listener] Skip (no request ID in subject): ${subject}`);
            } else if (await db.getMintRequestByEmailMessageId(messageId)) {
                // Idempotency: this exact email has already been processed.
                console.log(`[Email Listener] Skip ${requestId}: message ${messageId} already processed`);
            } else {
                const request = await db.getMintRequest(requestId);

                if (!request) {
                    console.log(`[Email Listener] Skip ${requestId}: no matching request`);
                } else if (NON_VERIFIABLE_STATUSES.has(request.status)) {
                    console.log(`[Email Listener] Skip ${requestId}: not verifiable in status '${request.status}'`);
                } else if (request.emailVerified) {
                    // Already verified by an earlier email. Nothing to do.
                    console.log(`[Email Listener] Skip ${requestId}: already email-verified`);
                } else if (request.status !== "pending" && request.status !== "paid") {
                    // Email verification is only meaningful pre-sweep. After sweep, ETH is
                    // already moved; the watcher will refund if email never arrives.
                    console.log(`[Email Listener] Skip ${requestId}: status is '${request.status}', verification only valid while pending or paid`);
                } else if (new Date(request.expiresAt).getTime() < Date.now()) {
                    console.log(`[Email Listener] Skip ${requestId}: request expired at ${request.expiresAt.toISOString()}`);
                } else if (from?.toLowerCase() !== request.email.toLowerCase()) {
                    console.log(`[Email Listener] Skip ${requestId}: sender ${from} does not match request email ${request.email}`);
                    logMintEvent("request_failed", request.userId, request.email, requestId, undefined, "failure", {
                        reason: "sender_email_mismatch",
                        sender: from,
                    });
                } else if (!request.morseChallenge) {
                    // Legacy requests pre-dating the morse-challenge column — reject for safety.
                    console.log(`[Email Listener] Skip ${requestId}: no morse challenge stored`);
                    logMintEvent("request_failed", request.userId, request.email, requestId, undefined, "failure", {
                        reason: "no_morse_challenge",
                    });
                } else {
                    // Strict body parse: first non-quoted line must be exactly the decoded morse challenge.
                    const decoded = extractChallengeFromBody(body);
                    if (!decoded) {
                        console.log(`[Email Listener] Skip ${requestId}: body does not contain a clean challenge code on its own line`);
                        logMintEvent("request_failed", request.userId, request.email, requestId, undefined, "failure", {
                            reason: "body_format_invalid",
                        });
                    } else if (decoded !== request.morseChallenge.toUpperCase()) {
                        console.log(`[Email Listener] Skip ${requestId}: decoded code '${decoded}' does not match challenge`);
                        logMintEvent("request_failed", request.userId, request.email, requestId, undefined, "failure", {
                            reason: "morse_challenge_mismatch",
                        });
                    } else {
                        // Atomic transition: mark verified AND record message ID. Returns null if
                        // a concurrent listener already processed this request (race protection).
                        const updated = await db.markEmailVerifiedWithMessageId(requestId, messageId);
                        if (updated) {
                            logMintEvent("request_executed", request.userId, request.email, requestId, undefined, "success", {
                                messageId,
                                sender: from,
                            });
                            console.log(`[Email Listener] Email verified for ${requestId} from ${from}; awaiting payment + sweep before mint`);
                        } else {
                            console.log(`[Email Listener] Skip ${requestId}: lost race, already verified`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("[Email Listener] Failed to process message:", err);
            shouldMarkSeen = false; // retry on transient errors
        }

        if (shouldMarkSeen) {
            try {
                await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
            } catch (err) {
                console.error("[Email Listener] Failed to flag seen:", err);
            }
        }
    }
}

export function encodeToMorse(text: string): string {
    return morseTranslator.encode(text);
}
