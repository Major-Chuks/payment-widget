"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./PaymentFlow.module.css";
import { useParams } from "next/navigation";
import {
  useAppKit,
  useAppKitNetwork,
  useDisconnect,
} from "@reown/appkit/react";
import { toast, Toaster } from "sonner";
import {
  useGetCryptoQuoteQuery,
  useGetPaymentDetailsForPayerQuery,
} from "@/api-services/generated";
import { baseURL } from "@/api-services/config/constants";
import { Header } from "../Header/Header";
import { ProductCard } from "../ProductCard/ProductCard";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import { PaymentStatusModal } from "../PaymentStatusModal/PaymentStatusModal";
import { LoadingState } from "../LoadingState/LoadingState";
import { ErrorState } from "../ErrorState/ErrorState";
import { SelectorOption } from "../DropdownSelector/DropdownSelector";
import { findAppKitNetwork } from "@/utils/networkMapping";
import { useExecutePayment } from "./useExecutePayment";
import { useTransfer } from "@/hooks/useTransfer";
import { formatBackendTokens } from "@/utils/paymentFormatters";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";
import { SwapToken } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";

const PaymentFlow: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<SelectorOption | null>(
    null,
  );
  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption | null>(
    null,
  );
  const [customerInfoData, setCustomerInfoData] = useState<
    Record<string, string>
  >({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const params = useParams();
  const identifier = params?.identifier as string;
  const {
    data: pd,
    isLoading: isPdLoading,
    isError,
  } = useGetPaymentDetailsForPayerQuery(identifier);

  const [swapTokens, setSwapTokens] = useState<SwapToken[]>([]);
  const [isFetchingSwapTokens, setIsFetchingSwapTokens] = useState(false);

  useEffect(() => {
    if (pd?.allows_token_swaps && pd?.swap_options?.input_tokens_url) {
      const fetchSwapTokens = async () => {
        try {
          setIsFetchingSwapTokens(true);
          const url = `${baseURL.replace(/\/$/, "")}/${pd.swap_options!.input_tokens_url.replace(/^\//, "")}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Network response was not ok");
          const result = await response.json();
          if (result?.data?.tokens) {
            setSwapTokens(result.data.tokens);
          }
        } catch (error) {
          console.error("Failed to fetch swap tokens", error);
        } finally {
          setIsFetchingSwapTokens(false);
        }
      };
      fetchSwapTokens();
    }
  }, [pd]);

  const computedCryptoOptions = useMemo(() => {
    if (pd?.allows_token_swaps && pd?.swap_options) {
      if (swapTokens.length > 0) {
        return swapTokens.map((t) => ({
          id: t.mint,
          slug: t.symbol,
          title: t.name,
          logo: t.logo || "",
          decimals: t.decimals,
          // All swap tokens share the single swap network; mint acts as token_address on Solana
          networks: [{ ...pd.swap_options!.network, token_address: t.mint }],
        }));
      }
      return [];
    }
    return pd?.crypto_options ?? [];
  }, [pd, swapTokens]);

  const {
    address,
    nativeBalance,
    nativeSymbol,
    tokenBalances,
    isConnected,
    chain,
  } = useTransfer({
    solanaTokens: formatBackendTokens(computedCryptoOptions).solanaTokens,
    evmTokens: formatBackendTokens(computedCryptoOptions).evmTokens,
  });

  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  const tokenBalance =
    tokenBalances.find(
      (t) => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase(),
    )?.balance ?? 0;
  const tokenSymbol =
    tokenBalances.find(
      (t) => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase(),
    )?.symbol ?? "";

  const {
    isPaying,
    paymentStep,
    showStatusModal,
    paymentStatus,
    paymentStatusDetails,
    setShowStatusModal,
    setPaymentStatus,
    setPaymentStatusDetails,
    executePayment,
  } = useExecutePayment();

  const { data: quote, refetch: refetchQuote } = useGetCryptoQuoteQuery(
    {
      identifier,
      params: {
        network_id: selectedNetwork?.id ?? "",
        ...(pd?.allows_token_swaps && pd?.swap_options
          ? { payer_token_mint: selectedToken?.id }
          : { cryptocurrency_id: selectedToken?.id }),
      },
    },
    { enabled: !!selectedNetwork && !!selectedToken },
  );

  const recipientAddress = useMemo(() => {
    if (!selectedNetwork || !pd) return "";
    // Prefer explicit recipient matching by network id
    const matched = pd.recipients.find(
      (r) => r.network.id === selectedNetwork.id,
    );
    if (matched) return matched.wallet_address;
    // Fallback: for swap mode the swap network may not appear in recipients,
    // but the payer sends to the swap contract — leave blank so executePayment handles it
    return "";
  }, [selectedNetwork, pd]);

  const handleConnectWallet = async () => {
    try {
      await disconnect();
      open();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTokenSelect = (token: SelectorOption) => {
    setSelectedToken(token);
    setSelectedNetwork(null);
  };

  const handleNetworkSelect = (option: SelectorOption | null) => {
    setSelectedNetwork(option);
  };

  const handlePay = () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!selectedNetwork?.id) {
      toast.error("Please select a network");
      return;
    }

    if (!selectedToken?.id) {
      toast.error("Please select a token");
      return;
    }

    if (!quoteId) {
      toast.error("Please refresh quote");
      return;
    }

    if (!pd) {
      toast.error("Payment details not found");
      return;
    }

    executePayment({
      payerAddress: address,
      networkId: selectedNetwork?.id,
      tokenId: selectedToken?.id,
      quoteId: quoteId,
      pd,
      customerInfoData,
      isSolana: chain?.toLowerCase() === "solana",
      identifier,
    });
  };

  usePaymentPolling({
    showStatusModal,
    paymentStatus,
    gatewayPaymentId: paymentStatusDetails?.gateway_payment_id,
    onSuccess: (result) => {
      setShowStatusModal(false);
      setPaymentStatusDetails((prev) => ({ ...prev, ...result }));
      setShowSuccessModal(true);
      toast.success("Payment confirmed!");
    },
    onFail: (error, txHash) => {
      setPaymentStatus("failed");
      setPaymentStatusDetails((prev) => ({
        ...prev,
        error: error ?? "Failed to confirm payment",
        tx_hash: txHash,
      }));
    },
  });

  // Auto-select first token (and network for swap mode) on load
  useEffect(() => {
    if (!computedCryptoOptions?.[0] || selectedToken) return;
    const opt = computedCryptoOptions[0];
    const swapNetwork =
      pd?.allows_token_swaps && pd.swap_options
        ? {
            id: pd.swap_options.network.id,
            name: pd.swap_options.network.title,
            icon: pd.swap_options.network.logo,
            symbol: pd.swap_options.network.slug.toUpperCase(),
          }
        : null;
    setSelectedToken({
      id: opt.id,
      name: opt.slug.toUpperCase(),
      subtitle: opt.title,
      icon: opt.logo,
      symbol: opt.slug.toUpperCase(),
      networks: opt.networks,
    });
    if (swapNetwork) setSelectedNetwork(swapNetwork);
  }, [computedCryptoOptions, selectedToken]);

  // Switch AppKit network once when selectedNetwork is set
  useEffect(() => {
    if (!selectedNetwork) return;

    const appKitNetwork = findAppKitNetwork(selectedNetwork.name);
    if (!appKitNetwork) {
      toast.error("Selected network is not supported");
      return;
    }

    switchNetwork(appKitNetwork)
      .then(() => console.log("Network switched successfully"))
      .catch((err) => console.error("Network switch failed:", err));
  }, [selectedNetwork]);

  useEffect(() => {
    if (quote) setQuoteId(quote.quote_id);
  }, [quote]);

  const isLoading = isPdLoading || isFetchingSwapTokens;
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
        isWalletConnected={isConnected}
        connectedWallet=""
        walletAddress={address ?? ""}
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
          itemPrice={Number(pd.price) || 0}
          priceDenomination={(
            pd.price_denomination_asset.slug ||
            pd.price_denomination_asset.code ||
            ""
          ).toUpperCase()}
          onConnectWallet={handleConnectWallet}
          quote={quote}
          refetchQuote={() => {
            if (!showStatusModal && !isPaying) refetchQuote();
          }}
          onPay={handlePay}
          isLoading={isPaying}
          loadingText={paymentStep}
          cryptoOptions={computedCryptoOptions}
          selectedNetwork={selectedNetwork}
          onNetworkSelect={handleNetworkSelect}
          selectedToken={selectedToken}
          onTokenSelect={handleTokenSelect}
          requiresCustomerInfo={pd.requires_customer_info}
          customerInfo={pd.customer_info}
          onCustomerInfoChange={setCustomerInfoData}
          isFormValid={isFormValid}
          onValidate={setIsFormValid}
          nativeBalance={nativeBalance}
          nativeSymbol={nativeSymbol}
          tokenBalance={tokenBalance}
          tokenSymbol={tokenSymbol}
          isNativeToken={
            selectedToken?.symbol?.toLowerCase() === nativeSymbol.toLowerCase()
          }
          tokenBalances={tokenBalances}
        />
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        amount={paymentStatusDetails?.amount_paid ?? "0"}
        network={selectedNetwork?.name ?? ""}
        tokenSymbol={paymentStatusDetails?.denomination ?? ""}
        txHash={paymentStatusDetails?.tx_hash ?? ""}
        fromAddress={address ?? ""}
        toAddress={recipientAddress}
        explorerUrl={paymentStatusDetails?.explorer_url ?? ""}
      />

      <PaymentStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onRetry={() => {
          setShowStatusModal(false);
          handlePay();
        }}
        status={paymentStatus}
        gatewayPaymentId={paymentStatusDetails?.gateway_payment_id ?? ""}
        transactionRef={paymentStatusDetails?.transaction_ref ?? ""}
        error={paymentStatusDetails?.error ?? ""}
      />
    </div>
  );
};

export default PaymentFlow;
