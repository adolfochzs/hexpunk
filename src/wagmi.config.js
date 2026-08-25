import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors";

// ─── WalletConnect Project ID ──────────────────────────────────────────────────
// Get one free at https://cloud.walletconnect.com
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  connectors: [
    // MetaMask & browser injected wallets (highest priority)
    injected({ target: "metaMask" }),
    // WalletConnect v2 — supports mobile wallets (Rainbow, Trust, etc.)
    ...(WC_PROJECT_ID
      ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })]
      : []),
    // Coinbase Wallet (including Smart Wallet)
    coinbaseWallet({
      appName: "HEXPUNK",
      appLogoUrl: "https://hexpunk.base.org/favicon.ico",
    }),
  ],
});
