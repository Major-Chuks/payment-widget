"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useConnection, useConfig, useSendTransaction, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useAppKit } from "@reown/appkit/react";
import { useParams } from "next/navigation";
import { Header } from "../Header/Header";
import { ProductCard } from "../ProductCard/ProductCard";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import { PaymentStatusModal } from "../PaymentStatusModal/PaymentStatusModal";
import styles from "./PaymentFlow.module.css";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SelectorOption } from "../DropdownSelector/DropdownSelector";
import { Toaster, toast } from "sonner";
import { LoadingState } from "../LoadingState/LoadingState";
import { ErrorState } from "../ErrorState/ErrorState";
import {
  useGetPaymentDetailsForPayerQuery,
  usePostCheckApprovalAndGetApproveTxMutation,
  usePostPreparePaymentTransactionMutation,
  usePostSubmitPaymentTxHashMutation,
} from "@/api-services/generated";
import { publicPaymentsApi } from "@/api-services/definitions/publicPayments";

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

  const { address, isConnected, connector, chainId } = useConnection();
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

  const handleConnectWallet = () => {
    open();
  };

  // --- Backend-driven payment flow hooks ---
  const { mutateAsync: checkApproval } = usePostCheckApprovalAndGetApproveTxMutation();
  const { mutateAsync: preparePayment } = usePostPreparePaymentTransactionMutation();
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation();
  const sendTransaction = useSendTransaction();
  const switchChain = useSwitchChain();

  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");

  // Post-payment status state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"submitted" | "pending" | "confirmed" | "failed">("submitted");
  const [paymentStatusDetails, setPaymentStatusDetails] = useState<{
    gatewayPaymentId?: string;
    transactionRef?: string;
    error?: string | null;
    txHash?: string;
  }>({});

  // The pollPaymentStatus function has been removed. 
  // We now rely entirely on the background polling useEffect below.

  // Background polling when PaymentStatusModal is open in a pending state
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (
      showStatusModal &&
      (paymentStatus === "submitted" || paymentStatus === "pending") &&
      paymentStatusDetails.gatewayPaymentId
    ) {
      intervalId = setInterval(async () => {
        try {
          const result = await publicPaymentsApi.get_checkPaymentStatus(
            paymentStatusDetails.gatewayPaymentId!
          );

          if (result.status === "confirmed") {
            // Background poll found it confirmed!
            setShowStatusModal(false);
            setPaymentStatusDetails((prev) => ({
              ...prev,
              txHash: result.tx_hash ?? undefined,
            }));
            setShowSuccessModal(true);
            fetchBalance();
            toast.success("Payment confirmed!");
          } else if (result.status === "failed") {
            // Background poll found it failed!
            setPaymentStatus("failed");
            setPaymentStatusDetails((prev) => ({
              ...prev,
              error: result.error,
              txHash: result.tx_hash ?? undefined,
            }));
          }
        } catch (error) {
          console.error("Background polling error:", error);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, paymentStatusDetails, fetchBalance]);

  const handlePay = async () => {
    if (!selectedNetwork || !selectedToken || !address) {
      toast.error(
        "Please select a network and ensure payment details are complete.",
      );
      return;
    }

    console.log("Processing payment for:", customerInfoData);
    setIsPaying(true);

    const commonPayload = {
      payer_address: address,
      network_id: selectedNetwork.id,
      cryptocurrency_id: selectedToken.id,
      quantity: 1,
    };

    try {
      // Step 1: Check approval & send approve tx if needed
      setPaymentStep("Checking token approval...");
      const approvalResult = await checkApproval({
        identifier,
        payload: commonPayload,
      });
      console.log("[Pay Step 1] Approval check result:", approvalResult);

      if (approvalResult.needs_approval) {
        setPaymentStep("Approving token spend...");
        const { tx } = approvalResult.approve_tx;
        console.log("[Pay Step 1] Sending approve tx:", tx);

        // Switch to the correct chain if needed
        const requiredChainId = parseInt(tx.chainId, 16);
        if (chainId !== requiredChainId) {
          setPaymentStep("Switching network...");
          await switchChain.mutateAsync({ chainId: requiredChainId });
        }

        const approveHash = await sendTransaction.mutateAsync({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
          gas: BigInt(tx.gas),
          chainId: requiredChainId,
        });

        setPaymentStep("Waiting for approval confirmation...");
        await waitForTransactionReceipt(config, { hash: approveHash });
        toast.success("Token approval confirmed!");
      } else {
        console.log("[Pay Step 1] No approval needed, skipping...");
      }

      // Step 2: Prepare the payment transaction
      setPaymentStep("Preparing payment...");
      const prepareResult = await preparePayment({
        identifier,
        payload: commonPayload,
      });
      console.log("[Pay Step 2] Prepare result:", prepareResult);

      // Step 3: Send the payment transaction
      setPaymentStep("Sending payment...");
      const payTx = prepareResult.payment_tx.tx;
      console.log("[Pay Step 3] Sending payment tx:", payTx);

      // Switch to the correct chain if needed
      const payChainId = parseInt(payTx.chainId, 16);
      if (chainId !== payChainId) {
        setPaymentStep("Switching network...");
        await switchChain.mutateAsync({ chainId: payChainId });
      }

      const payHash = await sendTransaction.mutateAsync({
        to: payTx.to as `0x${string}`,
        data: payTx.data as `0x${string}`,
        value: BigInt(payTx.value),
        gas: BigInt(payTx.gas),
        chainId: payChainId,
      });

      setPaymentStep("Waiting for payment confirmation...");
      await waitForTransactionReceipt(config, { hash: payHash });

      // Step 4: Submit the tx hash to backend
      setPaymentStep("Finalizing payment...");
      const submitResult = await submitPayment({
        identifier,
        payload: {
          prepare_id: prepareResult.prepare_id,
          tx_hash: payHash,
        },
      });
      console.log("[Pay Step 4] Submit result:", submitResult);

      // Step 5: Handle status from submitPayment
      if (submitResult.status === "submitted" || submitResult.status === "pending") {
        // Immediately show the pending modal and let the background useEffect poll
        setPaymentStatus("pending");
        setPaymentStatusDetails({
          gatewayPaymentId: submitResult.gateway_payment_id,
          transactionRef: submitResult.transaction_ref,
          txHash: payHash,
        });
        setShowStatusModal(true);
      } else {
        // submitPayment returned non-submitted status — show status modal with retry
        setPaymentStatus(submitResult.status as "pending" | "failed");
        setPaymentStatusDetails({
          gatewayPaymentId: submitResult.gateway_payment_id,
          transactionRef: submitResult.transaction_ref,
        });
        setShowStatusModal(true);
      }
    } catch (e) {
      console.error("Payment failed at step:", paymentStep, e);
      toast.error("Payment failed: " + (e as Error).message);
    } finally {
      setIsPaying(false);
      setPaymentStep("");
    }
  };

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
          isLoading={isPaying}
          loadingText={paymentStep}
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
        amount={pd.price}
        network={getChainName(chainId)}
        tokenSymbol={selectedToken?.symbol || "USDC"}
        txHash={paymentStatusDetails.txHash}
        fromAddress={address}
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
