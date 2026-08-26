import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// ─── Contract addresses ────────────────────────────────────────────────────────
export const REWARDS_CLAIM_ADDR = "0x17d138064C32c97ED546b285E466c30370546e99";
export const NFT_ADDR           = "0xad745891c3f90D94fB68bf0656Ea9EE1B5297161";

const REWARDS_CLAIM_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [],
  },
  {
    name: "hasClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "checkClaimedStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [{ name: "statuses", type: "bool[]" }],
  },
];

/**
 * useRewardsClaim — Manages the 1,000 $HEXPUNK reward claim for NFT Relic holders.
 * States: "idle" → "claiming" → "done" | "error"
 */
export function useRewardsClaim() {
  const [step, setStep]         = useState("idle"); // idle | claiming | done | error
  const [claimTxHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isClaimPending, isSuccess: isClaimConfirmed } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  const reset = useCallback(() => {
    setStep("idle");
    setTxHash(null);
    setErrorMsg(null);
  }, []);

  /**
   * Claim reward for one or multiple Token IDs.
   * @param {number[]|string[]} tokenIds - e.g. [1] or [1, 2, 5]
   */
  const claimReward = useCallback(
    async (tokenIds) => {
      setErrorMsg(null);

      if (!tokenIds || tokenIds.length === 0) {
        setErrorMsg("Please specify at least one Token ID.");
        setStep("error");
        return;
      }

      try {
        setStep("claiming");
        const formattedIds = tokenIds.map((id) => BigInt(id));

        const tx = await writeContractAsync({
          address: REWARDS_CLAIM_ADDR,
          abi: REWARDS_CLAIM_ABI,
          functionName: "claim",
          args: [formattedIds],
        });

        setTxHash(tx);
        setStep("done");
      } catch (e) {
        const msg = e?.shortMessage || e?.message || "Claim transaction failed";
        setErrorMsg(msg);
        setStep("error");
      }
    },
    [writeContractAsync]
  );

  return {
    step,
    claimTxHash,
    isClaimPending,
    isClaimConfirmed,
    errorMsg,
    claimReward,
    reset,
  };
}
