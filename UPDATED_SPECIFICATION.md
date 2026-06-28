# MINT EXPERIMENT SITE - COMPLETE SPECIFICATION & CONTEXT
**Last Updated:** May 11, 2026  
**Project Status:** 95% Complete (Phase 4 Verified - Deployment & Integration Finalized)  
**Current Phase:** Final User Acceptance Testing (Sepolia)

---

## 1. PROJECT OVERVIEW
*   **Project Name:** Mint Experiment Site
*   **Purpose:** Secure token minting platform with email verification, Morse code decoding, and automated blockchain distribution.
*   **Network:** Ethereum Sepolia Testnet (Current), Ethereum Mainnet (Production)
*   **Token:** TEST (100M total supply, 18 decimals)
*   **Owner Wallet:** `0x5F3B3FC51BD17F845763B1519778Cee30a2E496c`
*   **Backend Signer/Deployer:** `0x0f300b8b082B698D1475e0959Ba8A79FF881efD3` (Provided Private Key)

### Key Features (Updated)
*   **Email-First Auth:** User enters email, receives OTP, and is authenticated.
*   **Auto-Wallet Generation:** A unique Sepolia wallet is automatically generated and linked to the user's email upon first login.
*   **Morse Code Verification:** Unique Request IDs are encoded into Morse code. Users must decode and email the response back to the system inbox.
*   **Automated Email Listener:** System monitors `beraoogabooga@gmail.com` via IMAP to detect and verify user replies.
*   **Backend-Controlled Minting:** Upon verification, the system triggers the `MintMaster` vault to distribute tokens.

---

## 2. TOKEN & DEPLOYMENT DETAILS (SEPOLIA)
| Contract | Address |
| :--- | :--- |
| **MintToken (ERC20)** | `0xF81816f3221B916371a5846599D6662F62f0d4b9` |
| **MintMaster (Vault)** | `0x9c428A8A523cDB64f4558648d3D20737590bd70e` |

*   **Total Supply:** 100,000,000 TEST
*   **Initial Funding:** 100% of supply transferred to `MintMaster` vault for distribution.
*   **Distribution Rate:** 10,000 tokens per verified request.

---

## 3. FINALIZED USER FLOW
1.  **Login:** User connects via email and verifies with a 6-digit OTP.
2.  **Wallet:** System auto-generates a Sepolia wallet (if not already linked).
3.  **Prompt:** User clicks "Generate Prompt Email" and receives a Morse code string.
4.  **Verification:** 
    *   User decodes the Morse code (Request ID).
    *   User replies to the system email with the decoded ID.
5.  **Detection:** The `EmailListener` service detects the reply in the Gmail inbox.
6.  **Minting:** 
    *   System verifies the ID matches the user's pending request.
    *   System sweeps ETH (if required) and calls `MintMaster.distributeTokens()`.
7.  **Completion:** User receives tokens in their generated wallet.

---

## 4. COMPLETED WORK (UPDATED MAY 11)
### Phase 3 & 4: Blockchain & Integration ✅
*   **☑ Smart Contract Deployment:** Successfully deployed `MintToken` and `MintMaster` to Sepolia.
*   **☑ Morse Code Utility:** Implemented `encodeToMorse` utility for prompt generation.
*   **☑ Auto-Wallet Logic:** Modified `routers.ts` to automatically create and link wallets.
*   **☑ Email Listener Service:** Built `server/emailListener.ts` using `imapflow` to monitor Gmail inboxes in real-time.
*   **☑ Project Configuration:** Updated `mintConstants.ts` and `transactionService.ts` with live contract addresses.
*   **☑ Security:** Integrated Gmail App Passwords for secure IMAP access.

---

## 5. WHAT'S NEXT (POST-TESTING)
### Phase 5: Production & Mainnet 🚀
1.  **Mainnet Deployment:**
    *   Deploy contracts to Ethereum Mainnet.
    *   Update RPC URLs and Chain IDs to `1`.
    *   Fund the Mainnet Vault with the production token supply.
2.  **Infrastructure Scaling:**
    *   Move from SQLite to a production-grade database (MySQL/TiDB).
    *   Transition from `beraoogabooga@gmail.com` to a professional domain email (e.g., `verify@mint-experiment.com`) with SendGrid/Mailgun Inbound Parsing.
3.  **Security Hardening:**
    *   Implement AWS KMS or HashiCorp Vault for secure management of the Backend Signer's private key.
    *   Conduct a final smart contract audit.
4.  **UI/UX Polishing:**
    *   Add a "Morse Decoder" helper or hint system for users.
    *   Implement real-time WebSocket notifications for minting success.

---

## 6. ENVIRONMENT CONFIGURATION (UPDATED)
```env
PRIVATE_KEY=0x99e6... (Backend Signer)
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
EMAIL_USER=beraoogabooga@gmail.com
EMAIL_PASS=ecppqclabwnkosea (App Password)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```
