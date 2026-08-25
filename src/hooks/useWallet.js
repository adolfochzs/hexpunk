import { useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";

/**
 * useWallet — Simplified hook for wallet connection state.
 * Exposes: address, isConnected, connectors, connect, disconnect, ensureBase.
 */
export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [error, setError] = useState(null);

  const handleConnect = useCallback(
    async (connector) => {
      setError(null);
      try {
        connect({ connector });
      } catch (e) {
        setError(e.message || "Connection failed");
      }
    },
    [connect]
  );

  const handleDisconnect = useCallback(() => {
    disconnect();
    setError(null);
  }, [disconnect]);

  // Switches to Base Mainnet if the user is on the wrong network
  const ensureBase = useCallback(async () => {
    if (chain?.id !== base.id) {
      await switchChain({ chainId: base.id });
    }
  }, [chain, switchChain]);

  const isWrongNetwork = isConnected && chain?.id !== base.id;

  return {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    connectors,
    connect: handleConnect,
    disconnect: handleDisconnect,
    ensureBase,
    error,
  };
}
