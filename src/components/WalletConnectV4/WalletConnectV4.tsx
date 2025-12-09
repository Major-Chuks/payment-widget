/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useConnection,
  useConnectors,
} from "wagmi";
import styles from "./WalletConnectV4.module.css";

const WalletConnectApp: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Account state
  const { address, isConnected, connector } = useConnection();
  const connectorsList = useConnectors();

  const chainId = useChainId();

  const connect = useConnect();
  const disconnect = useDisconnect();

  const { data: balanceData } = useBalance({ address });

  /**
   * ✅ DEDUPE CONNECTORS (FIX)
   * Hide WalletConnect MetaMask entry if MetaMask is installed
   */
  const connectors = useMemo(() => {
    const hasInjectedMetaMask =
      typeof window !== "undefined" && (window as any).ethereum?.isMetaMask;

    return connectorsList.filter((c) => {
      if (c.id === "walletConnect" && hasInjectedMetaMask) {
        return false;
      }
      return true;
    });
  }, [connectorsList]);

  // Icons
  const getWalletIcon = (name: string) => {
    name = name.toLowerCase();
    if (name.includes("metamask")) return "🦊";
    if (name.includes("phantom")) return "👻";
    if (name.includes("coinbase")) return "🔵";
    if (name.includes("rabby")) return "🐰";
    if (name.includes("walletconnect"))
      return (
        <img
          src="https://www.walletconnect.com/_next/static/media/logo_mark.2c1e93c4.png"
          alt="WalletConnect"
          style={{ width: 26, height: 26 }}
        />
      );
    return "💼";
  };

  const getWalletBadge = (c: any) =>
    c.id === "walletConnect" ? (
      <span className={styles.qrBadge}>QR CODE</span>
    ) : (
      <span className={styles.installedBadge}>INSTALLED</span>
    );

  // Connect handler
  const handleConnect = async (c: any) => {
    try {
      if (c.id === "walletConnect") {
        setTimeout(() => {
          setIsModalOpen(false);
        }, 300);
        connect.mutateAsync({ connector: c });
      } else {
        await connect.mutateAsync({ connector: c });
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to connect");
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
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
            onClick={() => setIsModalOpen(true)}
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

      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderContent}>
                <button className={styles.helpButton}>?</button>
                <h2 className={styles.modalTitle}>Connect Wallet</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setIsModalOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.modalContent}>
              {connect.error && (
                <div className={styles.errorBox}>{connect.error.message}</div>
              )}

              <div className={styles.walletList}>
                {connectors.map((c) => (
                  <button
                    key={c.id}
                    className={styles.walletOption}
                    onClick={() => handleConnect(c)}
                    disabled={connect.isPending}
                  >
                    <div className={styles.walletLeft}>
                      <div className={styles.walletIconWrapper}>
                        {getWalletIcon(c.name)}
                      </div>
                      <span className={styles.walletName}>{c.name}</span>
                    </div>

                    <div className={styles.walletRight}>
                      {getWalletBadge(c)}
                      <span className={styles.arrow}>→</span>
                    </div>
                  </button>
                ))}

                <button className={styles.allWalletsOption}>
                  <div className={styles.walletLeft}>
                    <div className={styles.walletIconWrapper}>⋮</div>
                    <span className={styles.walletName}>All Wallets</span>
                  </div>
                  <span className={styles.walletCountBadge}>
                    {connectors.length}+
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnectApp;
