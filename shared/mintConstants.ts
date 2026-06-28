/**
 * Shared mint statistics and configuration constants
 * Updated for Sepolia Testnet Deployment
 */

export const MINT_CONFIG = {
  // Fixed configuration
  chain: "Sepolia",
  chainId: 11155111,
  mintAmount: 10000,
  mintAmountDisplay: "10,000",
  maxMintsPerEmail: 10,
  promptExpiry: 10, // minutes
  promptExpiryDisplay: "10 minutes",

  // Contract Addresses
  mintTokenAddress: "0xF81816f3221B916371a5846599D6662F62f0d4b9",
  mintMasterAddress: "0x9c428A8A523cDB64f4558648d3D20737590bd70e",
  ownerWallet: "0x5F3B3FC51BD17F845763B1519778Cee30a2E496c",

  // Current statistics (Mocked for UI, but updated to reflect new deployment)
  status: "Active",
  currentMinted: 0,
  currentMintedDisplay: "0",
  totalSupply: 100000000, // 100M
  totalSupplyDisplay: "100M",
  supplyLeft: 100000000,
  supplyLeftDisplay: "100M",
  walletFunding: 0.2, // ETH (from user's funding)
  walletFundingDisplay: "0.2 ETH",

  // Profile statistics
  userTokenBalance: 0,
  userTokenBalanceDisplay: "0",
  userTokensMinted: 0,
  userProfileCreatedDate: "May 11, 2026",
  userProfileCreatedAgo: "Today",
} as const;

export type MintConfig = typeof MINT_CONFIG;
