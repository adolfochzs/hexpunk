import { http, createConfig, fallback } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors";

// ─── RPC endpoints ────────────────────────────────────────────────────────────
const ALCHEMY_KEY  = import.meta.env.VITE_ALCHEMY_KEY || "";
const ALCHEMY_URL  = ALCHEMY_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : null;

// ─── WalletConnect Project ID ──────────────────────────────────────────────────
// Get one free at https://cloud.walletconnect.com
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: ALCHEMY_URL
      ? fallback([http(ALCHEMY_URL), http("https://mainnet.base.org")])
      : http("https://mainnet.base.org"),
  },
  connectors: [
    // MetaMask & browser injected wallets (highest priority)
    injected({ target: "metaMask" }),
    // WalletConnect v2 — supports mobile wallets (Rainbow, Trust, etc.)
    ...(WC_PROJECT_ID
      ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })]
      : []),
    // Coinbase Wallet (including Smart Wallet)
    // `preference.options` is required by SDK v4 — without it the connector
    // silently hangs deciding between Smart Wallet / extension / QR popup.
    coinbaseWallet({
      appName: "HEXPUNK",
      appLogoUrl: "https://www.hexpunk.xyz/favicon.ico",
      preference: {
        options: "all", // "all" (default) | "smartWalletOnly" | "eoaOnly"
      },
    }),
  ],
});
