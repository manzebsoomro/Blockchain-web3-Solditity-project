/**
 * Mint tier table — single source of truth for client, server, and email body.
 * tokens (whole units) -> ethCost (string, ETH not wei)
 */
export interface MintTier {
  tokens: number;
  ethCost: string;
  label: string;
}

export const MINT_TIERS: MintTier[] = [
  { tokens: 10000, ethCost: "0.001", label: "10,000 tokens — 0.001 ETH" },
  { tokens: 20000, ethCost: "0.002", label: "20,000 tokens — 0.002 ETH" },
  { tokens: 30000, ethCost: "0.003", label: "30,000 tokens — 0.003 ETH" },
  { tokens: 40000, ethCost: "0.004", label: "40,000 tokens — 0.004 ETH" },
  { tokens: 50000, ethCost: "0.005", label: "50,000 tokens — 0.005 ETH" },
  { tokens: 60000, ethCost: "0.006", label: "60,000 tokens — 0.006 ETH" },
  { tokens: 70000, ethCost: "0.007", label: "70,000 tokens — 0.007 ETH" },
  { tokens: 80000, ethCost: "0.008", label: "80,000 tokens — 0.008 ETH" },
  { tokens: 90000, ethCost: "0.009", label: "90,000 tokens — 0.009 ETH" },
  { tokens: 100000, ethCost: "0.01", label: "100,000 tokens — 0.01 ETH" },
];

export const ALLOWED_TOKEN_AMOUNTS = MINT_TIERS.map((t) => t.tokens);

export function getTier(tokens: number): MintTier | null {
  return MINT_TIERS.find((t) => t.tokens === tokens) ?? null;
}
