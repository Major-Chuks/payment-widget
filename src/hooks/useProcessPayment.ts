import { useState } from "react";
import { toast } from "sonner";
import { waitForTransactionReceipt } from "@wagmi/core";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  usePostCheckApprovalAndGetApproveTxMutation,
  usePostPreparePaymentTransactionMutation,
  usePostSubmitPaymentTxHashMutation,
} from "@/api-services/generated";
import { decodeBase64Tx, formatCustomerData } from "@/utils/paymentFormatters";

interface ProcessPaymentConfig {
  identifier: string;
  config: any; // wagmi config
  sendTransaction: any; // wagmi sendTransaction hook
  switchChain: any; // wagmi switchChain hook
  sendSolanaTransaction: any; // solana sendTransaction hook
  solanaConnection: any; // solana connection
}

export const useProcessPayment = ({
  identifier,
  config,
  sendTransaction,
  switchChain,
  sendSolanaTransaction,
  solanaConnection,
}: ProcessPaymentConfig) => {
  const { mutateAsync: checkApproval } =
    usePostCheckApprovalAndGetApproveTxMutation();
  const { mutateAsync: preparePayment } =
    usePostPreparePaymentTransactionMutation();
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation();

  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");

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

  const executePayment = async ({
    selectedNetwork,
    selectedToken,
    isSolana,
    pd,
    isFormValid,
    customerInfoData,
    address,
    publicKey,
    chainId,
    triggerEvmModal,
    triggerSolanaModal,
    setIsAwaitingConnection,
  }: any) => {
    if (!selectedNetwork || !selectedToken) {
      toast.error("Please select a network and token.");
      return;
    }

    if (isSolana && !publicKey) {
      setIsAwaitingConnection(true);
      triggerSolanaModal();
      toast.info("Please connect your Solana wallet to continue.");
      return;
    }

    if (!isSolana && !address) {
      setIsAwaitingConnection(true);
      triggerEvmModal();
      toast.info("Please connect your EVM wallet to continue.");
      return;
    }

    if (pd?.requires_customer_info && !isFormValid) {
      toast.error("Please fill in all required customer information.");
      return;
    }

    setIsPaying(true);
    const formattedCustomerData = formatCustomerData(
      pd?.requires_customer_info,
      customerInfoData,
    );

    if (isSolana) {
      try {
        setPaymentStep("Preparing Solana payment...");
        const prepareResult = await preparePayment({
          identifier,
          payload: {
            payer_address: publicKey!.toBase58(),
            network_id: selectedNetwork.id,
            cryptocurrency_id: selectedToken.id,
            quantity: 1,
            ...(formattedCustomerData
              ? { customer_data: formattedCustomerData }
              : {}),
          },
        });

        setPaymentStep("Awaiting wallet signature...");
        const txBuffer = decodeBase64Tx(
          prepareResult.payment_tx.tx as unknown as string,
        );

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
            prepare_id: prepareResult.prepare_id,
            tx_hash: signature,
          },
        });

        setPaymentStatus(
          submitResult.status === "failed" ? "failed" : "pending",
        );
        setPaymentStatusDetails({
          gatewayPaymentId: submitResult.gateway_payment_id,
          transactionRef: submitResult.transaction_ref,
          txHash: signature,
        });
        setShowStatusModal(true);
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
    try {
      const commonPayload = {
        payer_address: address!,
        network_id: selectedNetwork.id,
        cryptocurrency_id: selectedToken.id,
        quantity: 1,
      };

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
      const prepareResult = await preparePayment({
        identifier,
        payload: {
          ...commonPayload,
          ...(formattedCustomerData
            ? { customer_data: formattedCustomerData }
            : {}),
        },
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

      setPaymentStatus(submitResult.status === "failed" ? "failed" : "pending");
      setPaymentStatusDetails({
        gatewayPaymentId: submitResult.gateway_payment_id,
        transactionRef: submitResult.transaction_ref,
        txHash: payHash,
      });
      setShowStatusModal(true);
    } catch (e) {
      console.error("Payment failed at step:", paymentStep, e);
      toast.error("Payment failed: " + (e as Error).message);
    } finally {
      setIsPaying(false);
      setPaymentStep("");
    }
  };

  return {
    isPaying,
    paymentStep,
    executePayment,
    showStatusModal,
    setShowStatusModal,
    paymentStatus,
    setPaymentStatus,
    paymentStatusDetails,
    setPaymentStatusDetails,
  };
};
