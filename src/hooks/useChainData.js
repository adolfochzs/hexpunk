/**
 * useChainData.js
 * Reads live on-chain data from Base Mainnet.
 *
 * Strategy:
 *   - Historical Memo events → Basescan API (no block range limit, free)
 *   - Live stats (totalSupply, balanceOf) → Alchemy/public RPC via viem
 *
 * Events consumed:
 *   Memo(address indexed caller, bytes32 indexed memo)
 *   topic0: 0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8
 *
 * Contract: 0xb20000000000000000000024A9Cd928Ff6277db8 ($HEXPUNK B20)
 * Dead addr: 0x000000000000000000000000000000000000dEaD  (burned supply)
 */

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const HEXPUNK_ADDRESS = "0xb20000000000000000000024A9Cd928Ff6277db8";
const DEAD_ADDRESS    = "0x000000000000000000000000000000000000dEaD";
const INITIAL_SUPPLY  = 3_000_000n * 10n ** 18n;
const DECIMALS        = 18n;

// Memo event topic0 = keccak256("Memo(address,bytes32)")
const MEMO_TOPIC0 = "0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8";

// ─── API keys ─────────────────────────────────────────────────────────────────
const BASESCAN_KEY = import.meta.env.VITE_BASESCAN_KEY || "";
const ALCHEMY_KEY  = import.meta.env.VITE_ALCHEMY_KEY  || "";
const ALCHEMY_RPC  = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : null;

// ─── viem client — for live stats only (totalSupply, balanceOf) ───────────────
const client = createPublicClient({
  chain: base,
  transport: http(ALCHEMY_RPC || "https://mainnet.base.org"),
});

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

/** Extract short address from a 32-byte padded topic. */
function shortAddr(topic) {
  if (!topic) return "0x???";
  const addr = "0x" + topic.slice(-40);
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** Format a raw BigInt token amount (18 decimals) to a locale string. */
function formatTokens(raw) {
  const whole = raw / 10n ** DECIMALS;
  return Number(whole).toLocaleString("en-US");
}

// ─── Basescan API — fetch ALL Memo logs (no block range limit) ────────────────
/**
 * Fetches all Memo event logs using the Basescan API with pagination.
 * Basescan returns up to 1,000 results per page; we page through all.
 */
async function fetchLogsFromBasescan() {
  if (!BASESCAN_KEY) {
    console.warn("[useChainData] No VITE_BASESCAN_KEY set — skipping log fetch");
    return [];
  }

  const baseUrl = "https://api.basescan.org/api";
  const params = new URLSearchParams({
    module:    "logs",
    action:    "getLogs",
    address:   HEXPUNK_ADDRESS,
    topic0:    MEMO_TOPIC0,
    fromBlock: "0",
    toBlock:   "latest",
    page:      "1",
    offset:    "1000",
    apikey:    BASESCAN_KEY,
  });

  const allLogs = [];
  let page = 1;

  while (true) {
    params.set("page", String(page));
    const res  = await fetch(`${baseUrl}?${params}`);
    const json = await res.json();

    if (json.status !== "1" || !Array.isArray(json.result)) break;

    allLogs.push(...json.result);

    // Basescan returns max 1000/page; if we got fewer, we're done
    if (json.result.length < 1000) break;
    page++;
  }

  return allLogs;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cachedLogs      = null;   // null = never fetched; [] = fetched but empty
let _lastFetchTime   = 0;
const CACHE_TTL_MS   = 20 * 60 * 1000; // 20 minutes

// ─── React hook ──────────────────────────────────────────────────────────────
/**
 * @param {number} refreshMs  How often to re-poll. Default: 20 minutes.
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
        const now = Date.now();
        let logs = _cachedLogs;

        // Re-fetch logs if cache is cold or stale
        if (!logs || (now - _lastFetchTime) > CACHE_TTL_MS) {
          logs = await fetchLogsFromBasescan();
          _cachedLogs    = logs;
          _lastFetchTime = now;
        }

        // Parallel: live supply + dead balance via RPC
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
        const deadBalance   = deadResult.status   === "fulfilled" ? deadResult.value   : 0n;
        const burnedRaw     = (INITIAL_SUPPLY > currentSupply ? INITIAL_SUPPLY - currentSupply : 0n) + deadBalance;

        // Sort by blockNumber descending, take latest 10
        const sorted = [...logs].sort((a, b) => {
          const ba = BigInt(a.blockNumber);
          const bb = BigInt(b.blockNumber);
          return ba < bb ? 1 : ba > bb ? -1 : 0;
        });
        const recent = sorted.slice(0, 10);

        const scars = recent.map((log) => ({
          from:    shortAddr(log.topics[1]),
          memo:    decodeBytes32(log.topics[2] ?? ""),
          timeAgo: log.timeStamp
            ? timeAgo(Number(log.timeStamp))
            : "?",
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

    poll();

    const onVisible = () => {
      if (!cancelled && document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60)    return `${Math.max(1, diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
