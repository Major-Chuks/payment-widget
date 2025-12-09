import React, { useState } from "react";
import styles from "./Header.module.css";
import logo from "@/assets/logo.svg";
import Image from "next/image";
import ChevronDown from "@/assets/ChevronDown";
import CardHolder from "@/assets/CardHolder";
import CopyIcon from "@/assets/Copy";
import CheckIconRound from "@/assets/CheckIconRound";
import Button from "../Button/Button";
import { formatText } from "@/utils";
import SignOutIcon from "@/assets/SignOutIcon";
import { useDisconnect } from "wagmi";
import { Copy } from "../Copy/Copy";

interface HeaderProps {
  isWalletConnected: boolean;
  connectedWallet?: string;
  walletAddress?: string;
  chainName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isWalletConnected,
  walletAddress,
  connectedWallet,
  chainName,
}) => {
  console.log({ chainName, connectedWallet });

  const [disconnect, setDisconnect] = useState(false);

  const disconnectAccount = useDisconnect();

  const handleDisconnect = async () => {
    try {
      await disconnectAccount.mutateAsync();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image src={logo} alt="" />
      </div>
      {isWalletConnected && walletAddress && (
        <div className={styles.walletInfo}>
          <span className={styles.walletConnected}>
            <CheckIconRound />
            Wallet Connected
          </span>
          {!disconnect ? (
            <span className={styles.walletAddress}>
              <span className={styles.addressIcon}>
                <CardHolder />
              </span>
              {formatText(walletAddress, "clip", [6, 3])}
              <Copy text={walletAddress} color="#6148C2" />
            </span>
          ) : (
            <Button onClick={handleDisconnect} className={styles.disconnect}>
              <span className={styles.signOutIcon}>
                <SignOutIcon />
              </span>
              <span>Disconnect Wallet</span>
            </Button>
          )}
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
