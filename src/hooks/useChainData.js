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
 */

import { createPublicClient, http, fallback } from "viem";
import { base } from "viem/chains";
import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const HEXPUNK_ADDRESS = "0xb20000000000000000000024A9Cd928Ff6277db8";
const DEAD_ADDRESS    = "0x000000000000000000000000000000000000dEaD";
const INITIAL_SUPPLY  = 3_000_000n * 10n ** 18n;
const DECIMALS        = 18n;
const CHUNK_SIZE      = 9_900n; // Public Base RPCs strictly limit getLogs to 10,000 blocks/call

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

// ─── Client with automatic RPC Fallback ───────────────────────────────────────
const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base.llamarpc.com"),
    http("https://1rpc.io/base"),
    http("https://base.meowrpc.com"),
  ]),
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
 * Fetch logs in parallel safe chunks within public RPC's 10,000-block limit.
 */
async function getRecentLogs(latestBlock) {
  const chunk1From = latestBlock > CHUNK_SIZE ? latestBlock - CHUNK_SIZE : 0n;
  const chunk2From = latestBlock > CHUNK_SIZE * 2n ? latestBlock - CHUNK_SIZE * 2n : 0n;
  const chunk2To   = chunk1From > 0n ? chunk1From - 1n : 0n;

  const promises = [
    client.getLogs({
      address: HEXPUNK_ADDRESS,
      event: TRANSFER_WITH_MEMO_EVENT,
      fromBlock: chunk1From,
      toBlock: latestBlock,
    }),
  ];

  if (chunk2From < chunk2To) {
    promises.push(
      client.getLogs({
        address: HEXPUNK_ADDRESS,
        event: TRANSFER_WITH_MEMO_EVENT,
        fromBlock: chunk2From,
        toBlock: chunk2To,
      })
    );
  }

  const results = await Promise.allSettled(promises);
  const logs = [];
  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      logs.push(...res.value);
    }
  }
  return logs;
}

// ─── Main fetch function ──────────────────────────────────────────────────────
export async function fetchChainData() {
  const latestBlock = await client.getBlockNumber();

  // Parallel: event logs + contract supply + dead balance
  const [logsResult, supplyResult, deadResult] = await Promise.allSettled([
    getRecentLogs(latestBlock),
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

  // Latest 10 scars, newest first
  const recentLogs = [...logs].reverse().slice(0, 10);

  const scars = recentLogs.map((log) => ({
    from: shortAddr(log.topics[1]),
    memo: decodeBytes32(log.topics[2] ?? ""),
    timeAgo: blocksToTimeAgo(log.blockNumber, latestBlock),
    txHash: log.transactionHash,
  }));

  // Unique wallet addresses that have inscribed a scar
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

// ─── React hook ──────────────────────────────────────────────────────────────
export function useChainData() {
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

    fetchChainData()
      .then((result) => {
        if (!cancelled) setData({ ...result, loading: false, error: null });
      })
      .catch((err) => {
        console.error("[useChainData]", err);
        if (!cancelled)
          setData((prev) => ({
            ...prev,
            loading: false,
            burnedFragments: "0",
            activeCustodians: 0,
            error: null, // Fail gracefully without breaking UI
          }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
