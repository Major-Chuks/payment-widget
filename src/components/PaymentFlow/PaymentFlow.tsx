"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useChainId, useConfig } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useParams } from "next/navigation";
import { Header } from "../Header/Header";
import { ProductCard } from "../ProductCard/ProductCard";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import styles from "./PaymentFlow.module.css";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SelectorOption } from "../DropdownSelector/DropdownSelector";
import { useTransfer } from "@/hooks/useTransfer";
import { Toaster, toast } from "sonner";
import { LoadingState } from "../LoadingState/LoadingState";
import { ErrorState } from "../ErrorState/ErrorState";
import { useGetPaymentDetailsForPayerQuery } from "@/api-services/generated";

const PaymentFlow: React.FC = () => {
  const { open } = useAppKit();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerInfoData, setCustomerInfoData] = useState<
    Record<string, string>
  >({});
  const [isFormValid, setIsFormValid] = useState(false);

  const params = useParams();
  const identifier = (params?.identifier as string);

  const { data: pd, isLoading, isError } = useGetPaymentDetailsForPayerQuery(identifier);

  const { address, isConnected, connector } = useAccount();
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

  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption | null>(
    null,
  );

  // Initialize selectedToken with the first option if available, otherwise null
  const [selectedToken, setSelectedToken] = useState<SelectorOption | null>(
    pd?.crypto_options?.[0]
      ? {
        id: pd.crypto_options[0].slug,
        name: pd.crypto_options[0].slug.toUpperCase(),
        subtitle: pd.crypto_options[0].title,
        icon: pd.crypto_options[0].logo,
        symbol: pd.crypto_options[0].slug.toUpperCase(),
      }
      : null,
  );

  // Update selectedToken when pd loads if it was null
  useEffect(() => {
    if (!selectedToken && pd?.crypto_options?.[0]) {
      setSelectedToken({
        id: pd.crypto_options[0].slug,
        name: pd.crypto_options[0].slug.toUpperCase(),
        subtitle: pd.crypto_options[0].title,
        icon: pd.crypto_options[0].logo,
        symbol: pd.crypto_options[0].slug.toUpperCase(),
      });
    }
  }, [pd, selectedToken]);

  const handleNetworkSelect = (option: SelectorOption | null) => {
    setSelectedNetwork(option);
  };

  const handleTokenSelect = (option: SelectorOption) => {
    setSelectedToken(option);
  };

  const recipientAddress =
    selectedNetwork && pd
      ? pd.recipients.find((r) => r.network.slug === selectedNetwork.id)
        ?.wallet_address || ""
      : "";

  const itemPrice = pd?.price ? Number(pd.price) : 0;
  const totalPrice = 102.5;

  const handleConnectWallet = () => {
    open();
  };

  const { transfer, isTransferring, isSuccess, error } = useTransfer();

  const handlePay = async () => {
    if (!selectedNetwork || !recipientAddress || !selectedToken) {
      toast.error(
        "Please select a network and ensure payment details are complete.",
      );
      return;
    }

    console.log("Processing payment for:", customerInfoData);

    try {
      const networkData = pd?.crypto_options
        .find((opt) => opt.slug === selectedToken.id)
        ?.networks.find((n) => n.slug === selectedNetwork.id);

      const tokenContract = networkData?.token_address;

      await transfer({
        toAddress: recipientAddress,
        amount: itemPrice.toString(), // Using itemPrice. Should we use totalPrice?
        tokenContract: tokenContract,
      });
    } catch (e) {
      console.error("Payment failed", e);
      toast.error("Payment failed: " + (e as Error).message);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setShowSuccessModal(true);
      fetchBalance();
      toast.success("Payment successful!");
    }
  }, [isSuccess, fetchBalance]);

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
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

  if (isLoading) return <LoadingState />;
  if (!pd || isError)
    return (
      <ErrorState
        message="Failed to load payment details."
        onRetry={() => window.location.reload()}
      />
    );

  const handleCustomerInfoChange = (data: Record<string, string>) => {
    setCustomerInfoData(data);
    console.log("Customer Info Updated:", data);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  return (
    <div className={styles.paymentContainer}>
      <Toaster position="top-center" richColors />
      <Header
        isWalletConnected={isConnected}
        connectedWallet={connector?.name || ""}
        walletAddress={address}
        chainName={getChainName(chainId)}
      />

      <div className={styles.content}>
        <ProductCard
          recipient={recipientAddress}
          title={pd.product_title}
          description={pd.description}
          images={pd.images}
        />

        <PaymentCard
          isWalletConnected={isConnected}
          itemPrice={itemPrice}
          priceDenomination={pd.price_denomination_asset.slug.toUpperCase()}
          onConnectWallet={handleConnectWallet}
          onPay={handlePay}
          isLoading={isTransferring}
          balance={isPending ? "Loading..." : balance}
          balanceSymbol={symbol}
          cryptoOptions={pd.crypto_options}
          selectedNetwork={selectedNetwork}
          onNetworkSelect={handleNetworkSelect}
          selectedToken={selectedToken}
          onTokenSelect={handleTokenSelect}
          requiresCustomerInfo={pd.requires_customer_info}
          customerInfo={pd.customer_info}
          onCustomerInfoChange={handleCustomerInfoChange}
          isFormValid={isFormValid}
          onValidate={handleValidationChange}
        />
      </div>

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
