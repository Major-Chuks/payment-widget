"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useChainId, useConfig } from "wagmi";
import { Header } from "../Header/Header";
import { ProductCard } from "../ProductCard/ProductCard";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { WalletModal } from "../WalletModal/WalletModal";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import styles from "./PaymentFlow.module.css";
import { useTokenBalance } from "@/hooks/useTokenBalance";

const PaymentFlow: React.FC = () => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { address, isConnected, connector } = useConnection();
  const chainId = useChainId();
  const config = useConfig();

  const { balance, symbol, isPending, fetchBalance } = useTokenBalance({
    address: address || "",
    chainId: chainId || 1,
    config,
    // contractAddress: "0x..."
  });

  useEffect(() => {
    if (isConnected && address) {
      fetchBalance();
    }
  }, [isConnected, address, chainId, fetchBalance]);

  const itemPrice = 100;
  const totalPrice = 102.5;

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handlePay = () => {
    setShowSuccessModal(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    // Refresh balance after successful payment
    fetchBalance();
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

  return (
    <div className={styles.paymentContainer}>
      <Header
        isWalletConnected={isConnected}
        connectedWallet={connector?.name || ""}
        walletAddress={address}
        chainName={getChainName(chainId)}
      />

      <div className={styles.content}>
        <ProductCard
          recipient="0x8444...F3E"
          title="Club Tshirt"
          link="TEST LINK"
          imageUrl="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop"
        />

        <PaymentCard
          isWalletConnected={isConnected}
          itemPrice={itemPrice}
          onConnectWallet={handleConnectWallet}
          onPay={handlePay}
          balance={isPending ? "Loading..." : balance}
          balanceSymbol={symbol}
        />
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccess}
        amount={totalPrice}
        network={getChainName(chainId)}
      />
    </div>
  );
};

export default PaymentFlow;
