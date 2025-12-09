/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import { useConnect, useConnectors } from "wagmi";
import styles from "./WalletModal.module.css";
import CloseIcon from "@/assets/CloseIcon";
import { Modal } from "../Modal/Modal";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const connect = useConnect();
  const connectorsList = useConnectors();

  // Dedupe connectors - hide WalletConnect MetaMask if MetaMask is installed
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

  const getWalletIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("metamask")) return "🦊";
    if (nameLower.includes("phantom")) return "👻";
    if (nameLower.includes("coinbase")) return "🔵";
    if (nameLower.includes("rabby")) return "🐰";
    if (nameLower.includes("walletconnect")) return "🔗";
    return "💼";
  };

  const handleConnect = async (connector: any) => {
    try {
      await connect.mutateAsync({ connector });
      // Close modal after brief delay for WalletConnect QR
      if (connector.id === "walletConnect") {
        setTimeout(() => onClose(), 300);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("Connection error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.title}>
              <h3>Connect Wallet</h3>
              <button className={styles.closeBtn} onClick={onClose}>
                <CloseIcon />
              </button>
            </div>
            <p className={styles.modalSubtitle}>
              Connect a Ethereum wallet to continue
            </p>
          </div>

          {connect.error && (
            <div className={styles.errorBox}>{connect.error.message}</div>
          )}

          <div className={styles.walletList}>
            {connectors.map((connector) => {
              const isDetected = connector.id !== "walletConnect";

              return (
                <div
                  key={connector.id}
                  className={styles.walletItem}
                  onClick={() => handleConnect(connector)}
                >
                  <div className={styles.lhs}>
                    <span className={styles.walletIcon}>
                      {getWalletIcon(connector.name)}
                    </span>
                    <span className={styles.walletName}>{connector.name}</span>
                  </div>
                  <div className={styles.rhs}>
                    {isDetected ? (
                      <span className={styles.detectedBadge}>Detected</span>
                    ) : (
                      <span className={styles.qrBadge}>QR Code</span>
                    )}
                    <div className={styles.radioBtn}>
                      {isDetected && (
                        <div className={styles.radioSelected}></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
