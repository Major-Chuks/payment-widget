"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useConnection,
  useConfig,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  useWallet,
  useConnection as useSolanaConnection,
} from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Toaster, toast } from "sonner";

import { useGetPaymentDetailsForPayerQuery } from "@/api-services/generated";
import { useTokenBalance } from "@/hooks/useTokenBalance";

import { Header } from "../Header/Header";
import { ProductCard } from "../ProductCard/ProductCard";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import { PaymentStatusModal } from "../PaymentStatusModal/PaymentStatusModal";
import { LoadingState } from "../LoadingState/LoadingState";
import { ErrorState } from "../ErrorState/ErrorState";
import { SelectorOption } from "../DropdownSelector/DropdownSelector";
import styles from "./PaymentFlow.module.css";
import { useProcessPayment } from "@/hooks/useProcessPayment";
import { useConnectionWatcher } from "@/hooks/useConnectionWatcher";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";

// Imported Refactored Hooks

const PaymentFlow: React.FC = () => {
  const params = useParams();
  const identifier = params?.identifier as string;

  // -- Query Data --
  const {
    data: pd,
    isLoading,
    isError,
  } = useGetPaymentDetailsForPayerQuery(identifier);

  // -- Local State --
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerInfoData, setCustomerInfoData] = useState<
    Record<string, string>
  >({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption | null>(
    null,
  );
  const [selectedToken, setSelectedToken] = useState<SelectorOption | null>(
    null,
  );
  const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);

  // -- Wagmi / Solana Context --
  const { open: openEvmModal } = useAppKit();
  const { address, isConnected, connector, chainId } = useConnection();
  const config = useConfig();
  const sendTransaction = useSendTransaction();
  const switchChain = useSwitchChain();

  const { sendTransaction: sendSolanaTransaction, publicKey } = useWallet();
  const { connection: solanaConnection } = useSolanaConnection();
  const { setVisible: setSolanaModalVisible } = useWalletModal();

  const { balance, symbol, isPending, fetchBalance } = useTokenBalance({
    address: address || "",
    chainId: chainId || 1,
    config,
  });

  // -- Business Logic Hooks --
  const {
    isPaying,
    paymentStep,
    executePayment,
    showStatusModal,
    setShowStatusModal,
    paymentStatus,
    setPaymentStatus,
    paymentStatusDetails,
    setPaymentStatusDetails,
  } = useProcessPayment({
    identifier,
    config,
    sendTransaction,
    switchChain,
    sendSolanaTransaction,
    solanaConnection,
  });

  const isSolana =
    selectedNetwork?.name?.toString()?.toLowerCase().includes("solana") ||
    false;

  // -- UseEffects --
  useEffect(() => {
    if (isConnected && address) fetchBalance();
  }, [isConnected, address, chainId, fetchBalance]);

  useEffect(() => {
    if (!selectedToken && pd?.crypto_options?.[0]) {
      const opt = pd.crypto_options[0];
      setSelectedToken({
        id: opt.slug,
        name: opt.slug.toUpperCase(),
        subtitle: opt.title,
        icon: opt.logo,
        symbol: opt.slug.toUpperCase(),
      });
    }
  }, [pd, selectedToken]);

  useConnectionWatcher({
    isAwaitingConnection,
    setIsAwaitingConnection,
    isSolanaReady: isSolana && !!publicKey,
    isEvmReady: !isSolana && !!address,
    onReady: () => handlePay(),
  });

  usePaymentPolling({
    showStatusModal,
    paymentStatus,
    gatewayPaymentId: paymentStatusDetails.gatewayPaymentId,
    onSuccess: (txHash) => {
      setShowStatusModal(false);
      setPaymentStatusDetails((prev) => ({ ...prev, txHash }));
      setShowSuccessModal(true);
      fetchBalance();
      toast.success("Payment confirmed!");
    },
    onFail: (error, txHash) => {
      setPaymentStatus("failed");
      setPaymentStatusDetails((prev) => ({ ...prev, error, txHash }));
    },
  });

  // -- Handlers --
  const handlePay = () => {
    executePayment({
      selectedNetwork,
      selectedToken,
      isSolana,
      pd,
      isFormValid,
      customerInfoData,
      address,
      publicKey,
      chainId,
      triggerEvmModal: openEvmModal,
      triggerSolanaModal: () => setSolanaModalVisible(true),
      setIsAwaitingConnection,
    });
  };

  const recipientAddress =
    selectedNetwork && pd
      ? pd.recipients.find((r) => r.network.id === selectedNetwork.id)
          ?.wallet_address || ""
      : "";

  if (isLoading) return <LoadingState />;
  if (!pd || isError)
    return (
      <ErrorState
        message="Failed to load payment details."
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className={styles.paymentContainer}>
      <Toaster position="top-center" richColors />
      <Header
        isWalletConnected={isSolana ? !!publicKey : isConnected}
        connectedWallet={isSolana ? "Solana Wallet" : connector?.name || ""}
        walletAddress={isSolana ? publicKey?.toBase58() : address}
      />

      <div className={styles.content}>
        <ProductCard
          recipient={recipientAddress}
          title={pd.product_title}
          description={pd.description}
          images={pd.images}
        />

        <PaymentCard
          isWalletConnected={isSolana ? !!publicKey : isConnected}
          itemPrice={Number(pd.price) || 0}
          priceDenomination={pd.price_denomination_asset.slug?.toUpperCase()}
          onConnectWallet={() =>
            isSolana ? setSolanaModalVisible(true) : openEvmModal()
          }
          onPay={handlePay}
          isLoading={isPaying}
          loadingText={paymentStep}
          balance={isPending ? "Loading..." : balance}
          balanceSymbol={symbol}
          cryptoOptions={pd.crypto_options}
          selectedNetwork={selectedNetwork}
          onNetworkSelect={setSelectedNetwork}
          selectedToken={selectedToken}
          onTokenSelect={setSelectedToken}
          requiresCustomerInfo={pd.requires_customer_info}
          customerInfo={pd.customer_info}
          onCustomerInfoChange={setCustomerInfoData}
          isFormValid={isFormValid}
          onValidate={setIsFormValid}
        />
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        amount={pd.price}
        network={selectedNetwork?.name || ""}
        tokenSymbol={selectedToken?.symbol || "USDC"}
        txHash={paymentStatusDetails.txHash}
        fromAddress={isSolana ? publicKey?.toBase58() : address}
        toAddress={recipientAddress}
      />

      <PaymentStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onRetry={() => {
          setShowStatusModal(false);
          handlePay();
        }}
        status={paymentStatus}
        gatewayPaymentId={paymentStatusDetails.gatewayPaymentId}
        transactionRef={paymentStatusDetails.transactionRef}
        error={paymentStatusDetails.error}
      />
    </div>
  );
};

export default PaymentFlow;
