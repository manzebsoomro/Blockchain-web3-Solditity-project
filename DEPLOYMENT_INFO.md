# Mint Experiment Site - Sepolia Deployment Info

The smart contracts have been successfully integrated and deployed to the **Sepolia Testnet**.

## Contract Addresses

| Contract | Address |
| :--- | :--- |
| **MintToken (ERC-20)** | `0xCC4d6d1348cc75d926F71852DEB6e6e57372F002` |
| **MintMaster (Minter)** | `0x119C53dF3f7A3bAcd4D8f3D087cd962a114Ed44E` |

## Deployment Details

- **Network:** Sepolia Testnet (Chain ID: `11155111`)
- **Owner Wallet:** `0x5F3B3FC51BD17F845763B1519778Cee30a2E496c` (Receives ETH from minting)
- **Deployer Wallet:** `0x49D989f961080bc263E02A229A0Ad0f2D8b82aB8`
- **Initial Supply:** 100,000,000 MTK (Transferred to MintMaster for distribution)

## Minting Rates

The `MintMaster` contract supports the following minting rates:

- **0.001 ETH** -> 10,000 MTK
- **0.002 ETH** -> 20,000 MTK
- **0.01 ETH** -> 100,000 MTK

## Integration Summary

1.  **Smart Contracts:** Created `MintToken.sol` and `MintMaster.sol` in the `src/` directory.
2.  **Backend:** Updated `server/transactionService.ts` to use `ethers.js` for interacting with the Sepolia network.
3.  **Database:** Updated `server/db.ts` and `server/routers.ts` to use the Sepolia Chain ID (`11155111`) by default.
4.  **Frontend:** Updated `shared/mintConstants.ts` with the new contract addresses and Sepolia network info.
5.  **Email Prompts:** Updated `server/mintRequest.ts` to include payment instructions for the `MintMaster` contract in the generated emails.

## Testing

All backend tests (`npm test`) have been updated and are passing with the new Sepolia integration.

> **Note:** The private key for the dummy deployer wallet has been provided to you in the message. The `.env` file in the project directory has been removed for security.
