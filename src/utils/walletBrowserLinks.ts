// Paying from a phone browser means switching to the wallet app and back for
// every step, which phones handle badly (they freeze or reload the page in
// between, and some networks block WalletConnect's relay). Opening the
// checkout inside the wallet's own browser avoids all of that: the wallet is
// built into the page, so connecting and paying happen in one app.

export interface WalletBrowserLink {
  name: string;
  href: string;
}

/**
 * Links that open `url` in a wallet app's own browser, in the formats each
 * wallet documents:
 * - MetaMask: https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/
 * - Trust Wallet: https://developer.trustwallet.com/developer/develop-for-trust/deeplinking
 * - Base (formerly Coinbase Wallet): https://docs.cdp.coinbase.com/coinbase-wallet/developer-guidance/mobile-dapp-integration
 */
export function walletBrowserLinks(url: string): WalletBrowserLink[] {
  const encoded = encodeURIComponent(url);
  return [
    {
      name: "MetaMask",
      href: `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
    },
    {
      name: "Trust Wallet",
      // coin_id 60 (Ethereum) makes Trust inject its EVM wallet into the page
      href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encoded}`,
    },
    {
      name: "Base",
      href: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
    },
  ];
}

/**
 * True on a phone browser that has no wallet built in, where connecting would
 * mean switching apps. False inside a wallet's browser (it injects
 * `window.ethereum` or a Solana provider) and when the checkout is embedded
 * in a merchant's page, which a wallet browser couldn't open.
 */
export function shouldOfferWalletBrowsers(): boolean {
  if (typeof window === "undefined") return false;
  const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const injected = window as unknown as Record<string, unknown>;
  const inWalletBrowser = Boolean(
    injected.ethereum || injected.solana || injected.phantom,
  );
  const isEmbedded = window.parent !== window;
  return isPhone && !inWalletBrowser && !isEmbedded;
}
