"use client";

import React, { useState, useEffect } from "react";
import {
  useConnection,
  useConfig,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
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
import {
  publicPaymentsApi,
  CustomerDataPayload,
} from "@/api-services/definitions/publicPayments";

// Solana Imports
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  useWallet,
  useConnection as useSolanaConnection,
} from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const PaymentFlow: React.FC = () => {
  const { open } = useAppKit();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerInfoData, setCustomerInfoData] = useState<
    Record<string, string>
  >({});
  const [isFormValid, setIsFormValid] = useState(false);

  const params = useParams();
  const identifier = params?.identifier as string;

  const {
    data: pd,
    isLoading,
    isError,
  } = useGetPaymentDetailsForPayerQuery(identifier);

  // Wagmi (EVM) Hooks
  const { address, isConnected, connector, chainId } = useConnection();
  const config = useConfig();

  // Solana Hooks
  const { sendTransaction: sendSolanaTransaction, publicKey } = useWallet();
  const { connection: solanaConnection } = useSolanaConnection();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);

  const { balance, symbol, isPending, fetchBalance } = useTokenBalance({
    address: address || "",
    chainId: chainId || 1,
    config,
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
      ? pd.recipients.find((r) => r.network.id === selectedNetwork.id)
          ?.wallet_address || ""
      : "";

  const itemPrice = pd?.price ? Number(pd.price) : 0;

  // Determine if currently selected options point to Solana
  const isSolana = selectedNetwork?.name
    ?.toString()
    ?.toLowerCase()
    .includes("solana");

  const handleConnectWallet = () => {
    if (isSolana) {
      setSolanaModalVisible(true);
    } else {
      open();
    }
  };

  // --- Backend-driven payment flow hooks ---
  const { mutateAsync: checkApproval } =
    usePostCheckApprovalAndGetApproveTxMutation();
  const { mutateAsync: preparePayment } =
    usePostPreparePaymentTransactionMutation();
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation();
  const sendTransaction = useSendTransaction();
  const switchChain = useSwitchChain();

  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");

  // Post-payment status state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "submitted" | "pending" | "confirmed" | "failed"
  >("submitted");
  const [paymentStatusDetails, setPaymentStatusDetails] = useState<{
    gatewayPaymentId?: string;
    transactionRef?: string;
    error?: string | null;
    txHash?: string;
  }>({});

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
            paymentStatusDetails.gatewayPaymentId!,
          );

          if (result.status === "confirmed") {
            setShowStatusModal(false);
            setPaymentStatusDetails((prev) => ({
              ...prev,
              txHash: result.tx_hash ?? undefined,
            }));
            setShowSuccessModal(true);
            fetchBalance();
            toast.success("Payment confirmed!");
          } else if (result.status === "failed") {
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
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, paymentStatusDetails, fetchBalance]);

  // --- CONNECTION WATCHER ---
  useEffect(() => {
    // If the app is waiting for a connection...
    if (isAwaitingConnection) {
      // ...and the relevant wallet just connected
      const isSolanaReady = isSolana && publicKey;
      const isEvmReady = !isSolana && address;

      if (isSolanaReady || isEvmReady) {
        setIsAwaitingConnection(false); // Reset the flag so it doesn't loop

        // Optional: Add a tiny delay so the UI catches up before the wallet popup appears
        setTimeout(() => {
          handlePay();
        }, 500);
      }
    }
  }, [publicKey, address, isSolana, isAwaitingConnection]);

  const handlePay = async () => {
    if (!selectedNetwork || !selectedToken) {
      toast.error("Please select a network and token.");
      return;
    }

    // -- SOLANA: Not connected --
    if (isSolana && !publicKey) {
      setIsAwaitingConnection(true); // Remember they want to pay
      setSolanaModalVisible(true);
      toast.info("Please connect your Solana wallet to continue.");
      return;
    }

    // -- EVM: Not connected --
    if (!isSolana && !address) {
      setIsAwaitingConnection(true); // Remember they want to pay
      open();
      toast.info("Please connect your EVM wallet to continue.");
      return;
    }

    if (pd?.requires_customer_info && !isFormValid) {
      toast.error("Please fill in all required customer information.");
      return;
    }

    setIsPaying(true);

    // Prepare Customer Data logic (Shared for both Solana and EVM)
    let formattedCustomerData: CustomerDataPayload | undefined = undefined;
    if (pd?.requires_customer_info) {
      const {
        fullName,
        email,
        phone,
        city,
        country,
        streetName,
        streetNumber,
        zipCode,
      } = customerInfoData;

      const shipping_address = [
        streetNumber,
        streetName,
        city,
        zipCode,
        country,
      ]
        .filter(Boolean)
        .join(", ");

      formattedCustomerData = {
        name: fullName,
        email,
        phone,
        shipping_address: shipping_address || undefined,
      };
    }

    // --- SOLANA FLOW ---
    if (isSolana) {
      try {
        setPaymentStep("Preparing Solana payment...");

        const preparePayload = {
          payer_address: publicKey!.toBase58(),
          network_id: selectedNetwork.id,
          cryptocurrency_id: selectedToken.id,
          quantity: 1,
          ...(pd?.requires_customer_info && formattedCustomerData
            ? { customer_data: formattedCustomerData }
            : {}),
        };

        const prepareResult = await preparePayment({
          identifier,
          payload: preparePayload,
        });

        const base64Tx = prepareResult.payment_tx.tx;
        const prepareId = prepareResult.prepare_id;

        setPaymentStep("Awaiting wallet signature...");
        let txBuffer: Uint8Array;

        if (typeof base64Tx !== "string") {
          throw new Error(
            "Expected a base64 string for the Solana transaction, but got an object.",
          );
        }

        if (typeof atob === "function") {
          const binary = atob(base64Tx);
          const len = binary.length;
          txBuffer = new Uint8Array(len);
          for (let i = 0; i < len; i++) txBuffer[i] = binary.charCodeAt(i);
        } else {
          txBuffer = Uint8Array.from(Buffer.from(base64Tx, "base64"));
        }

        let transaction;
        try {
          transaction = VersionedTransaction.deserialize(txBuffer);
        } catch (e) {
          transaction = Transaction.from(txBuffer);
        }

        const signature = await sendSolanaTransaction(
          transaction,
          solanaConnection,
          {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          },
        );

        setPaymentStep("Finalizing payment...");
        const submitResult = await submitPayment({
          identifier,
          payload: {
            prepare_id: prepareId,
            tx_hash: signature,
          },
        });

        if (
          submitResult.status === "submitted" ||
          submitResult.status === "pending"
        ) {
          setPaymentStatus("pending");
          setPaymentStatusDetails({
            gatewayPaymentId: submitResult.gateway_payment_id,
            transactionRef: submitResult.transaction_ref,
            txHash: signature,
          });
          setShowStatusModal(true);
        } else {
          setPaymentStatus(submitResult.status as "pending" | "failed");
          setPaymentStatusDetails({
            gatewayPaymentId: submitResult.gateway_payment_id,
            transactionRef: submitResult.transaction_ref,
          });
          setShowStatusModal(true);
        }
      } catch (err) {
        console.error("Solana payment error:", err);
        toast.error("Solana payment failed: " + (err as Error).message);
      } finally {
        setIsPaying(false);
        setPaymentStep("");
      }
      return;
    }

    // --- EVM FLOW ---
    const commonPayload = {
      payer_address: address!,
      network_id: selectedNetwork.id,
      cryptocurrency_id: selectedToken.id,
      quantity: 1,
    };

    try {
      setPaymentStep("Checking token approval...");
      const approvalResult = await checkApproval({
        identifier,
        payload: commonPayload,
      });

      if (approvalResult.needs_approval) {
        setPaymentStep("Approving token spend...");
        const { tx } = approvalResult.approve_tx;

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
      }

      setPaymentStep("Preparing payment...");
      const preparePayload = {
        ...commonPayload,
        ...(pd?.requires_customer_info && formattedCustomerData
          ? { customer_data: formattedCustomerData }
          : {}),
      };

      const prepareResult = await preparePayment({
        identifier,
        payload: preparePayload,
      });

      setPaymentStep("Sending payment...");
      const payTx = prepareResult.payment_tx.tx;

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

      setPaymentStep("Finalizing payment...");
      const submitResult = await submitPayment({
        identifier,
        payload: {
          prepare_id: prepareResult.prepare_id,
          tx_hash: payHash,
        },
      });

      if (
        submitResult.status === "submitted" ||
        submitResult.status === "pending"
      ) {
        setPaymentStatus("pending");
        setPaymentStatusDetails({
          gatewayPaymentId: submitResult.gateway_payment_id,
          transactionRef: submitResult.transaction_ref,
          txHash: payHash,
        });
        setShowStatusModal(true);
      } else {
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
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

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
          itemPrice={itemPrice}
          priceDenomination={pd.price_denomination_asset.slug?.toUpperCase()}
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
