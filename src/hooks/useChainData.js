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

import { createPublicClient, http, fallback, decodeAbiParameters } from "viem";
import { base } from "viem/chains";
import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const HEXPUNK_ADDRESS = "0xb20000000000000000000024A9Cd928Ff6277db8";
const DEAD_ADDRESS    = "0x000000000000000000000000000000000000dEaD";
const INITIAL_SUPPLY  = 3_000_000n * 10n ** 18n;
const DECIMALS        = 18n;

// Memo event topic0 = keccak256("Memo(address,bytes32)")
const MEMO_TOPIC0 = "0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8";
// Announcement event topic0 = keccak256("Announcement(address,string,string,string)")
const ANNOUNCEMENT_TOPIC0 = "0xccebf8218a62875909564adef86a6f4df81503cb617221e793357d62f8e813f7";

// ─── RPC endpoints ────────────────────────────────────────────────────────────
const CDP_RPC      = import.meta.env.VITE_CDP_RPC_URL || "https://api.developer.coinbase.com/rpc/v1/base/bfKcCJ7nH3vh6dHauxcFRjYFxhRHFbmI";
const BASESCAN_KEY = import.meta.env.VITE_BASESCAN_KEY || "";
const ALCHEMY_KEY  = import.meta.env.VITE_ALCHEMY_KEY  || "";
const ALCHEMY_RPC  = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : null;

// ─── viem client — for live stats only (totalSupply, balanceOf) ───────────────
const client = createPublicClient({
  chain: base,
  transport: fallback([
    http(CDP_RPC),
    ...(ALCHEMY_RPC ? [http(ALCHEMY_RPC)] : []),
    http("https://mainnet.base.org"),
  ]),
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

// ─── Blockscout API — fetch logs by topic ────────────────────────────────────
/**
 * Fetches event logs for a given topic0 using the Base Blockscout API.
 */
async function fetchLogsByTopic(topic0) {
  const baseUrl = "https://base.blockscout.com/api";
  const params = new URLSearchParams({
    module:    "logs",
    action:    "getLogs",
    address:   HEXPUNK_ADDRESS,
    topic0:    topic0,
    fromBlock: "0",
    toBlock:   "latest",
    page:      "1",
    offset:    "1000",
  });

  const allLogs = [];
  let page = 1;

  while (true) {
    params.set("page", String(page));
    try {
      const res  = await fetch(`${baseUrl}?${params}`);
      const json = await res.json();

      if (json.status !== "1" || !Array.isArray(json.result)) break;

      allLogs.push(...json.result);

      if (json.result.length < 1000) break;
      page++;
    } catch (e) {
      console.warn("[useChainData] Failed to fetch logs from explorer:", e);
      break;
    }
  }

  return allLogs;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cachedMemos         = null;   // null = never fetched; [] = fetched but empty
let _cachedAnnouncements = null;
let _lastFetchTime       = 0;
const CACHE_TTL_MS       = 20 * 60 * 1000; // 20 minutes

// ─── React hook ──────────────────────────────────────────────────────────────
/**
 * @param {number} refreshMs  How often to re-poll. Default: 20 minutes.
 */
export function useChainData(refreshMs = 20 * 60 * 1000) {
  const [data, setData] = useState({
    events: [],
    scars: [],
    totalScars: 0,
    totalAnnouncements: 0,
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

        // Re-fetch logs if cache is cold or stale
        if (!_cachedMemos || !_cachedAnnouncements || (now - _lastFetchTime) > CACHE_TTL_MS) {
          const [memos, announcements] = await Promise.all([
            fetchLogsByTopic(MEMO_TOPIC0),
            fetchLogsByTopic(ANNOUNCEMENT_TOPIC0),
          ]);
          _cachedMemos         = memos;
          _cachedAnnouncements = announcements;
          _lastFetchTime       = now;
        }

        const memoLogs         = _cachedMemos || [];
        const announcementLogs = _cachedAnnouncements || [];

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

        // Parse Memo events
        const parsedMemos = memoLogs.map((log) => {
          let ts = null;
          if (log.timeStamp) {
            ts = typeof log.timeStamp === "string" && log.timeStamp.startsWith("0x")
              ? parseInt(log.timeStamp, 16)
              : Number(log.timeStamp);
          }
          return {
            type:        "memo",
            from:        shortAddr(log.topics[1]),
            memo:        decodeBytes32(log.topics[2] ?? ""),
            timeAgo:     ts ? timeAgo(ts) : "?",
            txHash:      log.transactionHash,
            blockNumber: BigInt(log.blockNumber || 0),
          };
        });

        // Parse Announcement events
        const parsedAnnouncements = announcementLogs.map((log) => {
          let ts = null;
          if (log.timeStamp) {
            ts = typeof log.timeStamp === "string" && log.timeStamp.startsWith("0x")
              ? parseInt(log.timeStamp, 16)
              : Number(log.timeStamp);
          }
          let id = "";
          let description = "";
          let uri = "";
          try {
            const decoded = decodeAbiParameters(
              [{ type: "string" }, { type: "string" }, { type: "string" }],
              log.data
            );
            id          = decoded[0];
            description = decoded[1];
            uri         = decoded[2];
          } catch (e) {
            console.warn("[useChainData] Failed to decode Announcement data:", e);
          }
          return {
            type:        "voice",
            from:        shortAddr(log.topics[1]),
            id,
            description,
            uri,
            timeAgo:     ts ? timeAgo(ts) : "?",
            txHash:      log.transactionHash,
            blockNumber: BigInt(log.blockNumber || 0),
          };
        });

        // Combine and sort by blockNumber descending, take latest 10
        const allEvents = [...parsedMemos, ...parsedAnnouncements].sort((a, b) => {
          return a.blockNumber < b.blockNumber ? 1 : a.blockNumber > b.blockNumber ? -1 : 0;
        });
        const recent = allEvents.slice(0, 10);

        const activeCustodians = new Set(
          memoLogs.map((log) => log.topics[1]?.toLowerCase()).filter(Boolean)
        ).size;

        if (!cancelled)
          setData({
            events: recent,
            scars: recent, // alias so existing references remain valid
            totalScars: memoLogs.length,
            totalAnnouncements: announcementLogs.length,
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
