import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

// ─── Contract addresses ────────────────────────────────────────────────────────
const TOKEN_ADDR       = "0xb20000000000000000000024A9Cd928Ff6277db8";
const MEMORY_HOLE_ADDR = "0x31605c0d4729B82D7C61039ccab06b53278d7E6E";

// ─── Minimal ABIs ──────────────────────────────────────────────────────────────
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

const MEMORY_HOLE_ABI = [
  {
    name: "castIntoTheVoid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",  type: "uint256" },
      { name: "epitaph", type: "bytes32" },
    ],
    outputs: [],
  },
];

/**
 * Convert a UTF-8 string (max 32 chars) to a 0x-prefixed bytes32 hex string.
 * Pure JS — avoids viem's pad() incompatibility with Uint8Array.
 */
function stringToBytes32(str) {
  const bytes = new TextEncoder().encode(str.slice(0, 32));
  const padded = new Uint8Array(32); // zero-padded 32-byte array
  padded.set(bytes);
  return ("0x" + Array.from(padded).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

/**
 * useMemoryHole — Manages the two-step burn ritual:
 *   Step 1: approve(MEMORY_HOLE_ADDR, amount) on the HEXPUNK token
 *   Step 2: castIntoTheVoid(amount, epitaph) on the MemoryHole contract
 *
 * States: "idle" → "approving" → "approved" → "burning" → "done" | "error"
 */
export function useMemoryHole() {
  const [step, setStep]     = useState("idle"); // idle | approving | approved | burning | done | error
  const [txHash, setTxHash] = useState(null);
  const [burnTxHash, setBurnTxHash] = useState(null);
  const [errorMsg, setErrorMsg]     = useState(null);

  const { writeContractAsync } = useWriteContract();

  // Watch for the burn tx confirmation
  const { isLoading: isBurnPending, isSuccess: isBurnConfirmed } =
    useWaitForTransactionReceipt({ hash: burnTxHash });

  const reset = useCallback(() => {
    setStep("idle");
    setTxHash(null);
    setBurnTxHash(null);
    setErrorMsg(null);
  }, []);

  /**
   * Execute the full ritual: approve → castIntoTheVoid
   * @param {string} amountStr - Amount in HEXPUNK tokens (e.g. "500")
   * @param {string} epitaphStr - Epitaph message (max 32 chars)
   */
  const sacrifice = useCallback(
    async (amountStr, epitaphStr) => {
      setErrorMsg(null);

      try {
        const amount  = parseUnits(amountStr, 18);
        const epitaph = stringToBytes32(epitaphStr);

        // ── Step 1: Approve ──────────────────────────────────────────────────
        setStep("approving");
        const approveTx = await writeContractAsync({
          address: TOKEN_ADDR,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MEMORY_HOLE_ADDR, amount],
        });
        setTxHash(approveTx);

        // ── Step 2: castIntoTheVoid ──────────────────────────────────────────
        setStep("approved");
        // Small delay so wallet UX has a moment to breathe
        await new Promise((r) => setTimeout(r, 800));

        setStep("burning");
        const burnTx = await writeContractAsync({
          address: MEMORY_HOLE_ADDR,
          abi: MEMORY_HOLE_ABI,
          functionName: "castIntoTheVoid",
          args: [amount, epitaph],
        });
        setBurnTxHash(burnTx);
        setStep("done");
      } catch (e) {
        // User rejected or tx failed
        const msg = e?.shortMessage || e?.message || "Transaction failed";
        setErrorMsg(msg);
        setStep("error");
      }
    },
    [writeContractAsync]
  );

  return {
    step,
    txHash,
    burnTxHash,
    isBurnPending,
    isBurnConfirmed,
    errorMsg,
    sacrifice,
    reset,
  };
}
