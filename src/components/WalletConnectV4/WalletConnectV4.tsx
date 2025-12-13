/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  useBalance,
  useChainId,
  useAccount
} from "wagmi";
import { useAppKit, useDisconnect, useAppKitAccount } from "@reown/appkit/react";
import styles from "./WalletConnectV4.module.css";

const WalletConnectApp: React.FC = () => {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  // We can use AppKitAccount for isConnected/address or Wagmi's useAccount. 
  // AppKit syncs with Wagmi, so useAccount is safer for other wagmi hooks.
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();

  const { data: balanceData } = useBalance({ address });

  // Connect handler
  const handleConnect = () => {
    open({ view: "Connect" });
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (e) {
      console.error(e);
    }
  };

  const getChainName = (id: number | undefined) => {
    switch (id) {
      case 1:
        return "Ethereum Mainnet";
      case 137:
        return "Polygon";
      case 42161:
        return "Arbitrum";
      case 56:
        return "BNB Chain";
      case 10:
        return "Optimism";
      case 8453:
        return "Base";
      default:
        return `Chain ${id}`;
    }
  };

  const shorten = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const formatBalance = () =>
    balanceData ? Number(balanceData.value).toFixed(4) : "0";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🔐</div>
          <h1 className={styles.title}>Web3 Wallet Connection</h1>
          <p className={styles.subtitle}>
            {isConnected
              ? "Your wallet is connected"
              : "Connect your wallet to get started"}
          </p>
        </div>

        {!isConnected ? (
          <button
            className={styles.connectButton}
            onClick={handleConnect}
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <div className={styles.walletInfo}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Wallet</span>
                <span className={styles.badge}>{connector?.name}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.label}>Network</span>
                <span className={styles.networkBadge}>
                  <span className={styles.dot} />
                  {getChainName(chainId)}
                </span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.label}>Address</span>
                <span className={styles.value}>{shorten(address)}</span>
              </div>

              <div className={`${styles.infoRow} ${styles.infoRowLast}`}>
                <span className={styles.label}>Balance</span>
                <span className={styles.value}>
                  {formatBalance()} {balanceData?.symbol ?? "ETH"}
                </span>
              </div>
            </div>

            <button
              className={styles.disconnectButton}
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletConnectApp;
