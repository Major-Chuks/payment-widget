import React, { useState } from "react";
import styles from "./Header.module.css";
import logo from "@/assets/logo.svg";
import Image from "next/image";
import ChevronDown from "@/assets/ChevronDown";
import CardHolder from "@/assets/CardHolder";
import CheckIconRound from "@/assets/CheckIconRound";
import Button from "../Button/Button";
import { formatAddress } from "@/utils";
import SignOutIcon from "@/assets/SignOutIcon";
import { useDisconnectWallet } from "@/hooks/useDisconnectWallet";
import { toast } from "sonner";
import { Copy } from "../Copy/Copy";

interface HeaderProps {
  isWalletConnected: boolean;
  connectedWallet?: string;
  walletAddress?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isWalletConnected,
  walletAddress,
}) => {
  const [disconnect, setDisconnect] = useState(false);

  const disconnectAccount = useDisconnectWallet();

  const handleDisconnect = async () => {
    try {
      await disconnectAccount();
      setDisconnect(false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't disconnect the wallet. Check your connection and try again.");
    }
  };

  return (
    <header className={styles.header}>
      <Image className={styles.logo} src={logo} alt="" />
      {isWalletConnected && walletAddress && (
        <div className={styles.walletInfo}>
          <span className={styles.walletConnected}>
            <CheckIconRound />
            Wallet Connected
          </span>
          <div className={styles.switchContainer}>
            <div
              className={`${styles.switchItem} ${!disconnect ? styles.active : ""
                }`}
            >
              <span className={styles.walletAddress}>
                <span className={styles.addressIcon}>
                  <CardHolder />
                </span>
                {formatAddress(walletAddress)}
                <Copy text={walletAddress} color="#6148C2" />
              </span>
            </div>

            <div
              className={`${styles.switchItem} ${disconnect ? styles.active : ""
                }`}
            >
              <Button onClick={handleDisconnect} className={styles.disconnect}>
                <span className={styles.signOutIcon}>
                  <SignOutIcon />
                </span>
                <span>Disconnect Wallet</span>
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setDisconnect(!disconnect)}
            className={`${styles.toggleBtn} ${disconnect && styles.toggle}`}
          >
            <ChevronDown color="#6148C2" />
          </Button>
        </div>
      )}
    </header>
  );
};
