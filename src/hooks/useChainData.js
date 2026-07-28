/**
 * useChainData.js
 * Reads live on-chain data from Base Mainnet — no API key required.
 *
 * Events consumed:
 *   TransferWithMemo(address indexed from, bytes32 indexed memo)
 *   topic: 0x6989f5818dcfd11f8cd53b27c94cec33dae1589735f03e639cba54553a1825e8
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
const DECIMALS        = 18n;
const BLOCK_RANGE     = 50_000n; // ~27 hours @ 2s/block on Base

// TransferWithMemo event ABI (indexed: from, memo — no data field)
const TRANSFER_WITH_MEMO_EVENT = {
  type: "event",
  name: "TransferWithMemo",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "memo", type: "bytes32", indexed: true },
  ],
};

// ERC-20 balanceOf ABI fragment
const BALANCE_OF_ABI = [{
  name: "balanceOf",
  type: "function",
  inputs:  [{ name: "account", type: "address" }],
  outputs: [{ name: "",        type: "uint256" }],
  stateMutability: "view",
}];

// ─── Client ───────────────────────────────────────────────────────────────────
const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
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

/**
 * Estimate relative time using block distance.
 * Base Mainnet ≈ 2 s / block — avoids individual eth_getBlockByNumber calls.
 */
function blocksToTimeAgo(logBlock, latestBlock) {
  const diffSeconds = Number(latestBlock - logBlock) * 2;
  if (diffSeconds < 60)   return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/** Format a raw BigInt token amount (18 decimals) to a locale string. */
function formatTokens(raw) {
  const whole = raw / 10n ** DECIMALS;
  return Number(whole).toLocaleString("en-US");
}

// ─── Main fetch function ──────────────────────────────────────────────────────
export async function fetchChainData() {
  const latestBlock = await client.getBlockNumber();
  const fromBlock   = latestBlock > BLOCK_RANGE ? latestBlock - BLOCK_RANGE : 0n;

  // Parallel: fetch event logs + burned balance
  const [logs, burnedRaw] = await Promise.all([
    client.getLogs({
      address: HEXPUNK_ADDRESS,
      event:   TRANSFER_WITH_MEMO_EVENT,
      fromBlock,
      toBlock: latestBlock,
    }),
    client.readContract({
      address:      HEXPUNK_ADDRESS,
      abi:          BALANCE_OF_ABI,
      functionName: "balanceOf",
      args:         [DEAD_ADDRESS],
    }),
  ]);

  // Latest 10 scars, newest first
  const recentLogs = [...logs].reverse().slice(0, 10);

  const scars = recentLogs.map((log) => ({
    from:    shortAddr(log.topics[1]),
    memo:    decodeBytes32(log.topics[2] ?? ""),
    timeAgo: blocksToTimeAgo(log.blockNumber, latestBlock),
    txHash:  log.transactionHash,
  }));

  return {
    scars,
    totalScars:      logs.length,
    burnedFragments: formatTokens(burnedRaw),
  };
}

// ─── React hook ──────────────────────────────────────────────────────────────
export function useChainData() {
  const [data, setData] = useState({
    scars:           [],
    totalScars:      0,
    burnedFragments: "—",
    loading:         true,
    error:           null,
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
          setData((prev) => ({ ...prev, loading: false, error: err.message }));
      });

    return () => { cancelled = true; };
  }, []);

  return data;
}
