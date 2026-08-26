/**
 * useChainData.js
 * Reads live on-chain data from Base Mainnet — no API key required.
 *
 * Events consumed:
 *   Memo(address indexed caller, bytes32 indexed memo)
 *   topic0: 0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8
 *          = keccak256("Memo(address,bytes32)")
 *
 * Contract: 0xb20000000000000000000024A9Cd928Ff6277db8 ($HEXPUNK B20)
 * Dead addr: 0x000000000000000000000000000000000000dEaD  (burned supply)
 * Deploy block: 48,380,580 — scans ALL history since genesis
 */

import { createPublicClient, http, fallback } from "viem";
import { base } from "viem/chains";
import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const HEXPUNK_ADDRESS = "0xb20000000000000000000024A9Cd928Ff6277db8";
const DEAD_ADDRESS    = "0x000000000000000000000000000000000000dEaD";
const INITIAL_SUPPLY  = 3_000_000n * 10n ** 18n;
const DECIMALS        = 18n;
const DEPLOY_BLOCK    = 48_380_580n; // Block where HEXPUNK was deployed on Base Mainnet
const CHUNK_SIZE      = 9_900n;      // Public Base RPCs strictly limit getLogs to 10,000 blocks/call
const MAX_PARALLEL    = 5;           // Max concurrent getLogs requests to avoid rate-limiting

// Memo event ABI
const TRANSFER_WITH_MEMO_EVENT = {
  type: "event",
  name: "Memo",
  inputs: [
    { name: "caller", type: "address", indexed: true },
    { name: "memo", type: "bytes32", indexed: true },
  ],
};

// ABI for totalSupply and balanceOf
const STATS_ABI = [
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

// ─── Client with Alchemy RPC (+ public fallback) ─────────────────────────────
// NOTE: base.llamarpc.com and 1rpc.io block CORS from custom origins — removed.
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY || "";
const ALCHEMY_RPC = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : null;

const client = createPublicClient({
  chain: base,
  transport: ALCHEMY_RPC
    ? fallback([http(ALCHEMY_RPC), http("https://mainnet.base.org")])
    : http("https://mainnet.base.org"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Decode a hex bytes32 topic into a human-readable UTF-8 string. */
function decodeBytes32(hex) {
  try {
    const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
    const trimmed = raw.replace(/00+$/, "");
    if (!trimmed) return "";
    const bytes = new Uint8Array(
      trimmed.match(/.{1,2}/g).map((b) => parseInt(b, 16))
    );
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
  } catch {
    return hex;
  }
}

/** Extract checksummed-style short address from a 32-byte padded topic. */
function shortAddr(topic) {
  if (!topic) return "0x???";
  const addr = "0x" + topic.slice(-40);
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** Estimate relative time using block distance (Base ≈ 2s/block). */
function blocksToTimeAgo(logBlock, latestBlock) {
  const diffSeconds = Number(latestBlock - logBlock) * 2;
  if (diffSeconds < 60) return `${Math.max(1, diffSeconds)}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/** Format a raw BigInt token amount (18 decimals) to a locale string. */
function formatTokens(raw) {
  const whole = raw / 10n ** DECIMALS;
  return Number(whole).toLocaleString("en-US");
}

/**
 * Fetch ALL Memo logs from fromBlock to toBlock.
 * Splits the range into 9,900-block chunks and runs MAX_PARALLEL at a time
 * to cover the full chain history without hitting RPC rate limits.
 */
async function getAllLogs(fromBlock, toBlock) {
  // Build the full list of chunks from fromBlock to toBlock
  const chunks = [];
  let cur = fromBlock;
  while (cur <= toBlock) {
    const end = cur + CHUNK_SIZE - 1n < toBlock ? cur + CHUNK_SIZE - 1n : toBlock;
    chunks.push({ from: cur, to: end });
    cur = end + 1n;
  }

  const logs = [];

  // Run chunks in batches of MAX_PARALLEL to avoid rate-limiting
  for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
    const batch = chunks.slice(i, i + MAX_PARALLEL);
    const results = await Promise.allSettled(
      batch.map((c) =>
        client.getLogs({
          address: HEXPUNK_ADDRESS,
          event: TRANSFER_WITH_MEMO_EVENT,
          fromBlock: c.from,
          toBlock: c.to,
        })
      )
    );
    for (const res of results) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        logs.push(...res.value);
      }
    }
  }

  return logs;
}

// ─── Main fetch function ──────────────────────────────────────────────────────
export async function fetchChainData() {
  const latestBlock = await client.getBlockNumber();

  // Parallel: ALL event logs (full history since deploy) + supply + dead balance
  const [logsResult, supplyResult, deadResult] = await Promise.allSettled([
    getAllLogs(DEPLOY_BLOCK, latestBlock),
    client.readContract({
      address: HEXPUNK_ADDRESS,
      abi: STATS_ABI,
      functionName: "totalSupply",
    }),
    client.readContract({
      address: HEXPUNK_ADDRESS,
      abi: STATS_ABI,
      functionName: "balanceOf",
      args: [DEAD_ADDRESS],
    }),
  ]);

  const logs = logsResult.status === "fulfilled" ? logsResult.value : [];
  const currentSupply = supplyResult.status === "fulfilled" ? supplyResult.value : INITIAL_SUPPLY;
  const deadBalance = deadResult.status === "fulfilled" ? deadResult.value : 0n;

  // Calculate burned supply: (INITIAL_SUPPLY - totalSupply) + dead balance
  const burnedRaw = (INITIAL_SUPPLY > currentSupply ? INITIAL_SUPPLY - currentSupply : 0n) + deadBalance;

  // Sort by block ascending, take latest 10, display newest first
  const sortedLogs = [...logs].sort((a, b) =>
    a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0
  );
  const recentLogs = sortedLogs.slice(-10).reverse();

  const scars = recentLogs.map((log) => ({
    from: shortAddr(log.topics[1]),
    memo: decodeBytes32(log.topics[2] ?? ""),
    timeAgo: blocksToTimeAgo(log.blockNumber, latestBlock),
    txHash: log.transactionHash,
  }));

  // Unique wallet addresses that have ever inscribed a scar
  const activeCustodians = new Set(
    logs.map((log) => log.topics[1]?.toLowerCase()).filter(Boolean)
  ).size;

  return {
    scars,
    totalScars: logs.length,
    burnedFragments: formatTokens(burnedRaw),
    activeCustodians,
  };
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// Persists across React re-mounts so the full history scan (~200 RPC calls)
// only happens once per browser session. Subsequent polls only fetch new blocks.
let _cachedLogs       = [];          // All Memo logs seen so far
let _lastScannedBlock = DEPLOY_BLOCK - 1n; // Last block fully scanned

// ─── React hook ──────────────────────────────────────────────────────────────
/**
 * @param {number} refreshMs  How often to re-poll for new blocks.
 *                            Default: 20 minutes. Set to 0 to disable auto-refresh.
 */
export function useChainData(refreshMs = 20 * 60 * 1000) {
  const [data, setData] = useState({
    scars: [],
    totalScars: 0,
    burnedFragments: "0",
    activeCustodians: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const latestBlock = await client.getBlockNumber();

        // Only scan blocks we haven't seen yet
        const fromBlock = _lastScannedBlock + 1n;

        let newLogs = [];
        if (fromBlock <= latestBlock) {
          newLogs = await getAllLogs(fromBlock, latestBlock);
          _cachedLogs = [..._cachedLogs, ...newLogs];
          _lastScannedBlock = latestBlock;
        }

        const logs = _cachedLogs;

        // Parallel: supply + dead balance (always fresh)
        const [supplyResult, deadResult] = await Promise.allSettled([
          client.readContract({
            address: HEXPUNK_ADDRESS,
            abi: STATS_ABI,
            functionName: "totalSupply",
          }),
          client.readContract({
            address: HEXPUNK_ADDRESS,
            abi: STATS_ABI,
            functionName: "balanceOf",
            args: [DEAD_ADDRESS],
          }),
        ]);

        const currentSupply = supplyResult.status === "fulfilled" ? supplyResult.value : INITIAL_SUPPLY;
        const deadBalance   = deadResult.status === "fulfilled"   ? deadResult.value   : 0n;
        const burnedRaw     = (INITIAL_SUPPLY > currentSupply ? INITIAL_SUPPLY - currentSupply : 0n) + deadBalance;

        // Sort by block, take latest 10, newest first
        const sortedLogs = [...logs].sort((a, b) =>
          a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0
        );
        const recentLogs = sortedLogs.slice(-10).reverse();

        const scars = recentLogs.map((log) => ({
          from:    shortAddr(log.topics[1]),
          memo:    decodeBytes32(log.topics[2] ?? ""),
          timeAgo: blocksToTimeAgo(log.blockNumber, latestBlock),
          txHash:  log.transactionHash,
        }));

        const activeCustodians = new Set(
          logs.map((log) => log.topics[1]?.toLowerCase()).filter(Boolean)
        ).size;

        if (!cancelled)
          setData({
            scars,
            totalScars: logs.length,
            burnedFragments: formatTokens(burnedRaw),
            activeCustodians,
            loading: false,
            error: null,
          });
      } catch (err) {
        console.error("[useChainData]", err);
        if (!cancelled)
          setData((prev) => ({ ...prev, loading: false, error: null }));
      }
    }

    // Initial fetch
    poll();

    // Re-poll when user returns to this tab (e.g. after signing a tx in their wallet)
    const onVisible = () => { if (!cancelled && document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);

    // Periodic refresh every 20 min (only fetches NEW blocks — very cheap)
    let timer;
    if (refreshMs > 0) {
      timer = setInterval(() => { if (!cancelled) poll(); }, refreshMs);
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshMs]);

  return data;
}
