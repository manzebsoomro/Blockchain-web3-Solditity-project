import { ethers } from "ethers";

/**
 * Sepolia RPC provider with automatic fallover between multiple endpoints.
 *
 * Configure via env:
 *   SEPOLIA_RPC_URLS=https://primary,https://secondary,https://tertiary  (comma-separated)
 *   SEPOLIA_RPC_URL=https://single-endpoint                              (legacy single endpoint)
 *
 * If neither is set, falls back to a list of free public Sepolia endpoints. When the active
 * endpoint returns a quota/auth/server error, the next endpoint is tried automatically on
 * the NEXT call. We do not rotate mid-call (ethers controls retry within a single call).
 */

const DEFAULT_RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://eth-sepolia.public.blastapi.io",
];

function parseRpcUrls(): string[] {
  const list = process.env.SEPOLIA_RPC_URLS;
  if (list) {
    const urls = list
      .split(",")
      .map((u) => u.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    if (urls.length > 0) return urls;
  }
  const single = process.env.SEPOLIA_RPC_URL;
  if (single) {
    const u = single.trim().replace(/^"|"$/g, "");
    if (u) return [u, ...DEFAULT_RPC_URLS.filter((d) => d !== u)];
  }
  return [...DEFAULT_RPC_URLS];
}

const RPC_URLS = parseRpcUrls();
let activeIndex = 0;
let activeProvider = new ethers.JsonRpcProvider(RPC_URLS[activeIndex]);
let lastRotationLog = 0;

function shouldRotateOnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; status?: number; info?: { responseStatus?: string } };
  // Quota / auth / server errors that mean "this endpoint is unusable right now"
  if (e.code === "SERVER_ERROR") return true;
  if (e.code === "UNKNOWN_ERROR") return true; // covers drpc's "User balance exceeded"
  if (e.code === "NETWORK_ERROR") return true;
  if (e.code === "TIMEOUT") return true;
  const status = e.info?.responseStatus || "";
  if (status.startsWith("403") || status.startsWith("429") || status.startsWith("5")) return true;
  return false;
}

export function rotateProviderOnError(err: unknown): void {
  if (!shouldRotateOnError(err)) return;
  if (RPC_URLS.length <= 1) return;
  const next = (activeIndex + 1) % RPC_URLS.length;
  if (next === activeIndex) return;
  activeIndex = next;
  activeProvider = new ethers.JsonRpcProvider(RPC_URLS[activeIndex]);
  // Throttle the rotation log to at most once per 30s to avoid spam during outages.
  const now = Date.now();
  if (now - lastRotationLog > 30_000) {
    console.warn(`[RPC] Rotated to fallback endpoint: ${RPC_URLS[activeIndex]} (${activeIndex + 1}/${RPC_URLS.length})`);
    lastRotationLog = now;
  }
}

export function getProvider(): ethers.JsonRpcProvider {
  return activeProvider;
}

export function getProviderUrl(): string {
  return RPC_URLS[activeIndex];
}

export function getRpcUrls(): readonly string[] {
  return RPC_URLS;
}

/**
 * Run an RPC call with automatic rotation on failure. Tries up to RPC_URLS.length endpoints
 * (each one once). The wrapped function receives the current active provider.
 */
export async function withRpcFallback<T>(fn: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RPC_URLS.length; attempt++) {
    try {
      return await fn(activeProvider);
    } catch (err) {
      lastErr = err;
      if (!shouldRotateOnError(err)) throw err;
      rotateProviderOnError(err);
      // If we cycled back to the same endpoint, give up.
      if (RPC_URLS.length === 1) throw err;
    }
  }
  throw lastErr;
}
