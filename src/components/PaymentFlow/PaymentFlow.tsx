"use client";

import {
  publicPaymentsKeys,
  useGetCreateAShortLivedExchangeRateQuoteForAPaymentQuery,
  useGetPayerSelectableSwapTokensForAPaymentQuery,
  useGetPaymentDetailsForPayerQuery,
} from "@/api-services/generated";
import { useAppKit, useAppKitNetwork } from "@reown/appkit/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDisconnectWallet } from "@/hooks/useDisconnectWallet";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import styles from "./PaymentFlow.module.css";

import { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus";
import {
  get_paymentDetailsForPayer,
  SwapOptions,
} from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import {
  CheckoutStatusEvent,
  useCheckoutStatusChannel,
} from "@/hooks/useCheckoutStatusChannel";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";
import { useTransfer } from "@/hooks/useTransfer";
import { emitWidgetEvent } from "@/utils/emitWidgetEvent";
import { findAppKitNetwork } from "@/utils/networkMapping";
import { parseMetaMaskError } from "@/utils/pareseMetamaskError";
import { formatBackendTokens } from "@/utils/paymentFormatters";
import { SelectorOption } from "../DropdownSelector/DropdownSelector";
import { ErrorState } from "../ErrorState/ErrorState";
import { Header } from "../Header/Header";
import { LoadingState } from "../LoadingState/LoadingState";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { PaymentStatusModal } from "../PaymentStatusModal/PaymentStatusModal";
import { ProductCard } from "../ProductCard/ProductCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import { useExecutePayment } from "./useExecutePayment";
import { usePaymentExpiration } from "@/hooks/usePaymentExpiration";
import {
  PaymentClosedCard,
  PaymentClosedReason,
} from "../PaymentClosedCard/PaymentClosedCard";
import {
  PaymentCountdown,
  PaymentExpiredWhileSigningNotice,
} from "../PaymentCountdown/PaymentCountdown";
import { type ApiError } from "@/api-services/config";
import { useDepositAmount } from "@/hooks/useDepositAmount";
import { DepositAmountField } from "../DepositAmountField/DepositAmountField";

// SOL kept back for account rent when paying in SOL. It's in SOL, so it
// doesn't apply to SPL or EVM tokens
const SOLANA_RENT_RESERVE_SOL = 0.0021;

// How often a charge's status is checked while its live channel is down
const STATUS_CHECK_INTERVAL_MS = 5000;

const isCancelledStatus = (status?: string) =>
  status === "cancelled" || status === "canceled";

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
  const [isRefetchingForPay, setIsRefetchingForPay] = useState(false);
  const successCompletionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSuccessResultRef = useRef<get_checkPaymentStatus | null>(null);
  const hasTriggeredSuccessCompletionRef = useRef(false);

  const params = useParams();
  const identifier = params?.identifier as string;
  const {
    data: pd,
    isLoading: isPdLoading,
    refetch: refetchPaymentDetails,
    error: pdError,
  } = useGetPaymentDetailsForPayerQuery(identifier);

  // The merchant deactivated or deleted the link, as a live update said. A
  // deleted link's details then fail with 404 (the last ones loaded stay)
  const [isLinkWithdrawn, setIsLinkWithdrawn] = useState(false);
  const isLinkDeleted = (pdError as ApiError | null)?.statusCode === 404;
  const isLinkUnavailable =
    isLinkWithdrawn || isLinkDeleted || pd?.status === "inactive";

  // Charges (chg_…) report status changes as they happen, such as the cashier
  // cancelling a POS sale. Apply them straight to the loaded details, so the
  // page switches at once without fetching
  const queryClient = useQueryClient();
  const chargeToken = identifier?.startsWith("chg_") ? identifier : null;
  const applyCheckoutStatus = async ({
    charge_status,
    expires_at,
    available,
  }: CheckoutStatusEvent) => {
    // Only availability updates carry `available`; payment progress updates
    // leave it as it is. Either way, the details say what's possible now
    if (typeof available === "boolean") {
      setIsLinkWithdrawn(!available);
      void refetchPaymentDetails();
    }
    const queryKey = publicPaymentsKeys.get_paymentDetailsForPayer(identifier);
    const previousStatus =
      queryClient.getQueryData<get_paymentDetailsForPayer>(
        queryKey,
      )?.charge_status;
    // A fetch already under way may predate this change; drop it so its
    // answer can't undo it
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<get_paymentDetailsForPayer>(
      queryKey,
      (current) =>
        current && {
          ...current,
          charge_status,
          ...(expires_at ? { expires_at } : {}),
        },
    );
    // The payer entered an amount (here or in another tab): the event doesn't
    // carry the price the payment screen shows
    if (
      previousStatus === "awaiting_amount" &&
      charge_status !== "awaiting_amount"
    ) {
      void refetchPaymentDetails();
    }
  };
  const isStatusLive = useCheckoutStatusChannel(chargeToken, {
    onStatus: applyCheckoutStatus,
    // Catch up on anything sent before the channel was joined
    onSubscribed: () => void refetchPaymentDetails(),
  });

  const isDynamicFromUrl = useMemo(() => {
    if (identifier?.startsWith("chg_")) return true;
    if (typeof window !== "undefined") {
      try {
        const search = new URLSearchParams(window.location.search);
        if (
          search.get("dynamic") === "true" ||
          search.get("is_dynamic") === "true"
        ) {
          return true;
        }
        const stored = sessionStorage.getItem(`orki_dynamic_${identifier}`);
        if (stored !== null) return stored === "true";
      } catch {
        // ignore
      }
    }
    return false;
  }, [identifier]);

  const isDynamic = pd?.is_dynamic ?? isDynamicFromUrl;

  useEffect(() => {
    if (pd && identifier && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `orki_dynamic_${identifier}`,
          String(Boolean(pd.is_dynamic)),
        );
      } catch {
        // ignore
      }
    }
  }, [pd, identifier]);

  const [selectedSwapNetwork, setSelectedSwapNetwork] =
    useState<SwapOptions | null>(null);

  // Auto-select the first swap network when payment details load
  useEffect(() => {
    if (
      pd?.allows_token_swaps &&
      pd.swap_networks?.length &&
      !selectedSwapNetwork
    ) {
      setSelectedSwapNetwork(pd.swap_networks[0]);
    }
  }, [pd]);

  const { data: swapTokenData, isLoading: isFetchingSwapTokens } =
    useGetPayerSelectableSwapTokensForAPaymentQuery(
      {
        identifier,
        params: { network_id: selectedSwapNetwork?.network_id ?? "" },
      },
      {
        enabled:
          !!selectedSwapNetwork &&
          pd?.allows_token_swaps === true &&
          // Refused with 409 until a Deposit link has an amount; retrying
          // would hold the page on its loading screen
          pd?.charge_status?.toLowerCase() !== "awaiting_amount",
      },
    );

  const computedCryptoOptions = useMemo(() => {
    if (pd?.allows_token_swaps && pd.swap_networks?.length) {
      const tokens = swapTokenData?.tokens ?? [];
      if (tokens.length > 0) {
        const allNetworks = pd.swap_networks.map((sn) => sn.network);
        return tokens.map((t) => ({
          id: t.mint,
          slug: t.symbol,
          title: t.name,
          logo: t.logo || "",
          decimals: t.decimals,
          networks: allNetworks.map((n) => ({ ...n, token_address: t.mint })),
        }));
      }
      return [];
    }
    return pd?.crypto_options ?? [];
  }, [pd, swapTokenData]);

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
  const disconnect = useDisconnectWallet();

  const currentNetworkTokenAddress = selectedToken?.networks?.find(
    (n) =>
      n.id === selectedNetwork?.id ||
      n.slug?.toLowerCase() === selectedNetwork?.symbol?.toLowerCase() ||
      n.title?.toLowerCase() === selectedNetwork?.name?.toLowerCase(),
  )?.token_address;

  const currentTokenBalanceObj =
    (currentNetworkTokenAddress
      ? tokenBalances.find(
          (t) =>
            t.contractAddress.toLowerCase() ===
            currentNetworkTokenAddress.toLowerCase(),
        )
      : null) ??
    tokenBalances.find(
      (t) => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase(),
    );

  // null means unknown (not loaded, or the read failed), which never blocks Pay
  const tokenBalance = currentTokenBalanceObj?.balance ?? null;
  const tokenSymbol =
    currentTokenBalanceObj?.symbol ?? selectedToken?.symbol ?? "";

  const {
    isPaying,
    paymentStep,
    paymentSignature,
    hasPreparedPayment,
    showStatusModal,
    paymentStatus,
    paymentStatusDetails,
    setShowStatusModal,
    setPaymentStatus,
    setPaymentStatusDetails,
    executePayment,
  } = useExecutePayment();

  const chargeStatus = pd?.charge_status?.toLowerCase();

  // A dynamic payment is a single charge: once this page confirms a payment it
  // stays paid, even though the payment details aren't fetched again
  const isPaid =
    chargeStatus === "paid" || (isDynamic && paymentStatus === "confirmed");
  const isCancelled = isCancelledStatus(chargeStatus);
  // The customer's transaction failed on chain. The backend never marks a
  // charge failed on a timer, so this is final
  const isFailed = chargeStatus === "failed";
  // A Deposit link before the payer's first amount reaches the backend, so
  // there's nothing to quote yet
  const isAwaitingAmount = chargeStatus === "awaiting_amount";
  // A dashboard Deposit link: the payer enters the amount on the payment card
  // and can change it until they pay
  const takesAmount = pd?.charge_source === "deposit_link" || isAwaitingAmount;
  const merchantName = pd?.merchant?.name || undefined;

  // A payment the wallet may still send (or already sent), or its result
  const isPaymentActive =
    paymentSignature !== "none" || showStatusModal || showSuccessModal;

  const {
    isExpired,
    hasExpiry,
    timeLeftMs,
    formattedTimeLeft,
    isUrgent,
    expirationDate,
    deadlineMs,
  } = usePaymentExpiration({
    expiresAt: pd?.expires_at,
    chargeStatus: pd?.charge_status,
    // Only a payment the wallet may still send (or already sent) holds the page;
    // expiry during approval or preparation stops the flow instead
    isCompletedOrInFlight: isPaymentActive || isPaid,
  });

  // Why the form is replaced by a closed screen, if it is. A paid dynamic
  // payment never shows the form again, so it can't be paid twice. A Deposit
  // link's expires_at is the Deposit's deadline, before and after the payer
  // enters an amount, so it closes then like any other charge
  const closedReason: PaymentClosedReason | null =
    isDynamic && isPaid
      ? "paid"
      : isCancelled && !isPaymentActive && !isPaid
        ? "cancelled"
        : isFailed && !isPaymentActive && !isPaid
          ? "failed"
          : isExpired
            ? "expired"
            : isLinkUnavailable && !isPaymentActive && !isPaid
              ? "unavailable"
              : null;

  // Without the live channel, check a charge every few seconds while the
  // customer can still pay, so a cancel still shows within seconds. A
  // deactivated link is checked too, in case the merchant turns it back on
  const shouldCheckStatus =
    !!chargeToken &&
    !!pd &&
    !isStatusLive &&
    (!closedReason || (closedReason === "unavailable" && !isLinkDeleted)) &&
    !isPaymentActive &&
    !isPaid;

  useEffect(() => {
    if (!shouldCheckStatus) return;
    const intervalId = setInterval(
      () => void refetchPaymentDetails(),
      STATUS_CHECK_INTERVAL_MS,
    );
    return () => clearInterval(intervalId);
  }, [shouldCheckStatus, refetchPaymentDetails]);

  // Leaving now could lose track of a payment the wallet is sending
  useEffect(() => {
    if (paymentSignature === "none") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [paymentSignature]);

  const hasEmittedExpiredRef = useRef(false);

  // Notify the merchant once, the moment the expired screen is shown
  useEffect(() => {
    if (!isExpired || !isDynamic || hasEmittedExpiredRef.current) return;
    hasEmittedExpiredRef.current = true;
    emitWidgetEvent("ORKI_PAYMENT_EXPIRED", {
      identifier,
      expires_at: pd?.expires_at,
      redirect_url: pd?.redirect_url,
    });
  }, [isExpired, isDynamic, identifier, pd?.expires_at, pd?.redirect_url]);

  const emittedUnrecordedTxHashRef = useRef("");

  // A payment was sent but never recorded: tell the merchant money arrived
  useEffect(() => {
    const txHash = paymentStatusDetails?.tx_hash;
    if (paymentStatus !== "unrecorded" || !isDynamic || !txHash) return;
    if (emittedUnrecordedTxHashRef.current === txHash) return;
    emittedUnrecordedTxHashRef.current = txHash;
    emitWidgetEvent("ORKI_PAYMENT_ERROR", {
      reason: "unrecorded",
      error: paymentStatusDetails?.error,
      tx_hash: txHash,
      identifier,
    });
  }, [
    paymentStatus,
    isDynamic,
    identifier,
    paymentStatusDetails?.tx_hash,
    paymentStatusDetails?.error,
  ]);

  const {
    data: quote,
    refetch: refetchQuote,
    isError: isQuoteError,
    error: quoteError,
  } = useGetCreateAShortLivedExchangeRateQuoteForAPaymentQuery(
    {
      identifier,
      params: {
        network_id: selectedNetwork?.id ?? "",
        ...(pd?.allows_token_swaps && pd?.swap_options
          ? { payer_token_mint: selectedToken?.id, payer_address: address }
          : { cryptocurrency_id: selectedToken?.id }),
      },
    },
    {
      enabled:
        !!selectedNetwork &&
        !!selectedToken &&
        !!address &&
        !isPaying &&
        !isRefetchingForPay &&
        !showStatusModal &&
        !showSuccessModal &&
        paymentStatus !== "confirmed" &&
        !isPaid &&
        !isCancelled &&
        !isExpired &&
        // The API refuses quotes until there's an amount
        !isAwaitingAmount,
    },
  );

  const depositAmount = useDepositAmount({
    identifier,
    enabled: takesAmount,
    savedAmount: takesAmount ? (pd?.price ?? null) : null,
    denomination: pd?.price_denomination ?? "fiat",
    // From a successful payment preparation on, the backend keeps the amount
    isLocked: hasPreparedPayment,
    isUnavailable: isLinkUnavailable,
    onAmountChanged: () => {
      // The payment details are fetched again by the request itself. A quote
      // for the old amount is refused, so drop it and ask for a new one
      setQuoteId(null);
      void queryClient.resetQueries({
        queryKey: [
          ...publicPaymentsKeys.all,
          "get_createAShortLivedExchangeRateQuoteForAPayment",
        ],
      });
    },
    onStale: () => void refetchPaymentDetails(),
  });

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
      toast.error(parseMetaMaskError(error));
    }
  };

  const handleTokenSelect = (token: SelectorOption) => {
    setSelectedToken(token);
    setSelectedNetwork(null);
  };

  const handleNetworkSelect = (option: SelectorOption | null) => {
    setSelectedNetwork(option);
    if (option && pd?.swap_networks?.length) {
      const match = pd.swap_networks.find((sn) => sn.network.id === option.id);
      if (match && match.network_id !== selectedSwapNetwork?.network_id) {
        setSelectedSwapNetwork(match);
        setSelectedToken(null);
      }
    }
  };

  const handlePay = async () => {
    // Check the clock directly: onRetry calls this from a stale closure where
    // isExpired is still masked by the open status modal
    const hasLapsed = deadlineMs !== null && Date.now() >= deadlineMs;
    if (isExpired || hasLapsed) {
      toast.error("This payment session has expired");
      return;
    }

    // A Deposit link: the backend must have the amount on screen before the
    // payment is quoted and prepared. The field shows why if it can't
    if (takesAmount) {
      setIsRefetchingForPay(true);
      const hasAmount = await depositAmount
        .flush()
        .finally(() => setIsRefetchingForPay(false));
      if (!hasAmount) return;
    }

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

    if (!pd) {
      toast.error("Payment details not found");
      return;
    }

    setIsRefetchingForPay(true);
    try {
      // Alongside the fresh quote, check the charge can still be paid: the
      // merchant may have cancelled it, or it may already have been paid
      const [
        { data: refreshedQuote, isError: isRefreshError },
        { data: latestPd },
      ] = await Promise.all([refetchQuote(), refetchPaymentDetails()]);

      const latestStatus = latestPd?.charge_status?.toLowerCase();
      if (isCancelledStatus(latestStatus)) {
        toast.error("This payment has been cancelled");
        return;
      }
      if (latestStatus === "expired") {
        toast.error("This payment session has expired");
        return;
      }
      if (latestStatus === "failed") {
        toast.error("This payment has failed. Ask the merchant for a new one");
        return;
      }
      if (isDynamic && latestStatus === "paid") {
        toast.error("This payment has already been made");
        return;
      }
      // No amount reached the backend
      if (latestStatus === "awaiting_amount") {
        toast.error("Enter an amount first");
        return;
      }

      const currentQuoteId = refreshedQuote?.quote_id || quoteId;

      if (!currentQuoteId || isRefreshError) {
        toast.error("Please refresh quote");
        return;
      }

      executePayment({
        payerAddress: address,
        networkId: selectedNetwork?.id,
        tokenId: selectedToken?.id,
        quoteId: currentQuoteId,
        pd: latestPd ?? pd,
        customerInfoData,
        isSolana: chain?.toLowerCase() === "solana",
        identifier,
        deadlineMs,
      });
    } finally {
      setIsRefetchingForPay(false);
    }
  };

  // Only a dynamic payment started from the merchant's site has somewhere to
  // go back to: it's embedded there, was opened by it in a new tab, or has a
  // redirect address. A POS sale (also dynamic) is opened by scanning a QR
  // code, so there's nothing to return to, and a page can't close a tab the
  // customer opened, so the closed screen then shows no button
  const canReturnToMerchant =
    isDynamic &&
    typeof window !== "undefined" &&
    (window.parent !== window ||
      !!pd?.redirect_url ||
      (!!window.opener && !window.opener.closed));

  const handleReturnToMerchant = (reason: PaymentClosedReason) => {
    const isEmbedded = window.parent && window.parent !== window;

    if (isDynamic) {
      emitWidgetEvent("ORKI_CLOSE", {
        reason,
        identifier,
        redirect_url: pd?.redirect_url,
      });
    }

    // Embedded: the merchant's page owns navigation and handles ORKI_CLOSE
    // (same as the success flow, which never redirects from inside an iframe)
    if (isEmbedded) return;

    if (pd?.redirect_url) {
      window.location.replace(pd.redirect_url);
    } else if (window.opener && !window.opener.closed) {
      window.close();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  const triggerSuccessCompletion = (result?: get_checkPaymentStatus | null) => {
    if (hasTriggeredSuccessCompletionRef.current) return;
    hasTriggeredSuccessCompletionRef.current = true;

    if (successCompletionTimerRef.current) {
      clearTimeout(successCompletionTimerRef.current);
      successCompletionTimerRef.current = null;
    }

    const res = result || latestSuccessResultRef.current;
    const isEmbedded =
      typeof window !== "undefined" &&
      window.parent &&
      window.parent !== window;

    if (isDynamic && res) {
      emitWidgetEvent("ORKI_PAYMENT_SUCCESS", {
        gateway_payment_id: res.gateway_payment_id,
        transaction_ref: res.transaction_ref,
        tx_hash: res.tx_hash,
        status: res.status,
        amount: res.payer_token?.amount,
        token: res.payer_token?.symbol,
        network: selectedNetwork?.name,
        identifier,
        explorer_url: res.explorer_url,
        redirect_url: pd?.redirect_url,
        result: res,
      });
    }

    if (pd?.redirect_url && !isEmbedded) {
      const redirectUrl = pd.redirect_url;
      const redirectOption = pd.redirect_option || "auto";

      if (redirectOption !== "none") {
        window.location.replace(redirectUrl);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (successCompletionTimerRef.current) {
        clearTimeout(successCompletionTimerRef.current);
      }
    };
  }, []);

  usePaymentPolling({
    showStatusModal,
    paymentStatus,
    gatewayPaymentId: paymentStatusDetails?.gateway_payment_id,
    onSuccess: (result) => {
      // Dynamic payments are settled by this one payment. Reusable links stay
      // open for the next payer, so their status isn't frozen at "confirmed"
      if (isDynamic) setPaymentStatus("confirmed");
      setShowStatusModal(false);
      setPaymentStatusDetails((prev) => ({ ...prev, ...result }));
      setShowSuccessModal(true);
      toast.success("Payment confirmed!");

      latestSuccessResultRef.current = result;
      hasTriggeredSuccessCompletionRef.current = false;

      const isEmbedded =
        typeof window !== "undefined" &&
        window.parent &&
        window.parent !== window;

      const shouldRedirect = Boolean(
        pd?.redirect_url && !isEmbedded && pd?.redirect_option !== "none",
      );

      // Keep success modal visible for about 3 seconds before triggering redirect or closing checkout window
      if (isDynamic || shouldRedirect) {
        if (successCompletionTimerRef.current) {
          clearTimeout(successCompletionTimerRef.current);
        }
        successCompletionTimerRef.current = setTimeout(() => {
          triggerSuccessCompletion(result);
        }, 3000);
      }
    },
    onFail: (error, txHash) => {
      setPaymentStatus("failed");
      const chainType = chain?.toLowerCase() === "solana" ? "solana" : "evm";
      const parsedError = error
        ? parseMetaMaskError(error, chainType)
        : "Failed to confirm payment";
      setPaymentStatusDetails((prev) => ({
        ...prev,
        error: parsedError,
        tx_hash: txHash,
      }));
      toast.error(parsedError);

      if (isDynamic) {
        emitWidgetEvent("ORKI_PAYMENT_ERROR", {
          error: parsedError,
          tx_hash: txHash,
          gateway_payment_id: paymentStatusDetails?.gateway_payment_id,
          identifier,
        });
      }
    },
  });

  // Auto-select first token (and network for swap mode) on load
  useEffect(() => {
    if (!computedCryptoOptions?.[0] || selectedToken) return;
    const opt = computedCryptoOptions[0];
    const swapNetwork = selectedSwapNetwork
      ? {
          id: selectedSwapNetwork.network.id,
          name: selectedSwapNetwork.network.title,
          icon: selectedSwapNetwork.network.logo,
          symbol: selectedSwapNetwork.network.slug.toUpperCase(),
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
  }, [computedCryptoOptions, selectedToken, selectedSwapNetwork]);

  // Switch AppKit network once when selectedNetwork is set
  useEffect(() => {
    if (!selectedNetwork) return;

    const appKitNetwork = findAppKitNetwork({
      slug: selectedNetwork.symbol,
      name: selectedNetwork.name,
    });
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

  // A Deposit link's swap tokens load once the payer enters an amount; the
  // page stays, so the amount field keeps its focus
  const isLoading =
    isPdLoading ||
    (!!pd?.allows_token_swaps && isFetchingSwapTokens && !takesAmount);

  if (isLoading) return <LoadingState isDynamic={isDynamic} />;
  // Only when nothing loaded: a failed background check keeps the page as is
  if (!pd)
    return (
      <ErrorState
        message="Failed to load payment details."
        onRetry={() => window.location.reload()}
      />
    );

  const priceDenomination = (
    pd.price_denomination_asset.slug ||
    pd.price_denomination_asset.code ||
    ""
  ).toUpperCase();

  const isNativeToken =
    selectedToken?.symbol?.toLowerCase() === nativeSymbol.toLowerCase();

  const paidToken = paymentStatusDetails?.payer_token;
  const paidAmount = paidToken?.amount
    ? `${paidToken.amount} ${paidToken.symbol ?? ""}`.trim()
    : undefined;

  return (
    <div className={styles.paymentContainer}>
      <Toaster position="top-center" richColors closeButton />

      <Header
        isWalletConnected={isConnected}
        connectedWallet=""
        walletAddress={address ?? ""}
      />

      <div
        className={`${styles.content} ${
          isDynamic || closedReason ? styles.dynamicContent : ""
        }`}
      >
        {!isDynamic && !closedReason && (
          <ProductCard
            recipient={recipientAddress}
            title={pd.product_title}
            description={pd.description}
            images={pd.images}
          />
        )}

        {closedReason ? (
          <PaymentClosedCard
            reason={closedReason}
            merchantName={merchantName}
            // A Deposit link that expired before the payer entered an amount
            price={pd.price === null ? undefined : Number(pd.price) || 0}
            priceDenomination={priceDenomination}
            expirationDate={expirationDate}
            identifier={identifier}
            paidAmount={paidAmount}
            explorerUrl={paymentStatusDetails?.explorer_url}
            onReturnToMerchant={
              canReturnToMerchant
                ? () => handleReturnToMerchant(closedReason)
                : undefined
            }
          />
        ) : (
          <PaymentCard
            amountField={
              takesAmount ? (
                <DepositAmountField
                  value={depositAmount.value}
                  onChange={depositAmount.onChange}
                  onBlur={depositAmount.onBlur}
                  currencyCode={priceDenomination}
                  currencySymbol={pd.price_denomination_asset.symbol}
                  maxDecimals={depositAmount.maxDecimals}
                  // Can't change while a payment is under way
                  disabled={
                    depositAmount.isDisabled ||
                    isPaying ||
                    isRefetchingForPay ||
                    isPaymentActive
                  }
                  isLocked={depositAmount.isLocked}
                  error={depositAmount.error}
                  blocked={depositAmount.blocked}
                />
              ) : undefined
            }
            isPayBlocked={
              takesAmount &&
              (!depositAmount.hasAmount || !!depositAmount.blocked)
            }
            merchantName={merchantName}
            isWalletConnected={isConnected}
            itemPrice={Number(pd.price) || 0}
            priceDenomination={priceDenomination}
            onConnectWallet={handleConnectWallet}
            quote={quote}
            disableQuoteRefresh={
              isPaying ||
              isRefetchingForPay ||
              showStatusModal ||
              showSuccessModal ||
              paymentStatus === "confirmed" ||
              isPaid
            }
            refetchQuote={() => {
              if (!showStatusModal && !isPaying) refetchQuote();
            }}
            onPay={handlePay}
            isLoading={isPaying || isRefetchingForPay}
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
            isNativeToken={isNativeToken}
            tokenBalances={tokenBalances}
            balanceReserve={
              chain?.toLowerCase() === "solana" && isNativeToken
                ? SOLANA_RENT_RESERVE_SOL
                : 0
            }
            isQuoteError={isQuoteError}
            quoteError={quoteError}
          />
        )}
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (
            !hasTriggeredSuccessCompletionRef.current &&
            latestSuccessResultRef.current
          ) {
            triggerSuccessCompletion(latestSuccessResultRef.current);
          } else if (isDynamic) {
            emitWidgetEvent("ORKI_CLOSE");
          }
        }}
        amount={paymentStatusDetails?.payer_token?.amount ?? "0"}
        network={selectedNetwork?.name ?? ""}
        tokenSymbol={paymentStatusDetails?.payer_token?.symbol ?? ""}
        txHash={paymentStatusDetails?.tx_hash ?? ""}
        fromAddress={address ?? ""}
        toAddress={recipientAddress}
        explorerUrl={paymentStatusDetails?.explorer_url ?? ""}
      />

      <PaymentStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          if (isDynamic && paymentStatus === "failed") {
            emitWidgetEvent("ORKI_PAYMENT_CANCEL");
          }
        }}
        onRetry={() => {
          setShowStatusModal(false);
          handlePay();
        }}
        status={paymentStatus}
        gatewayPaymentId={paymentStatusDetails?.gateway_payment_id ?? ""}
        transactionRef={paymentStatusDetails?.transaction_ref ?? ""}
        txHash={
          paymentStatus === "unrecorded" ? paymentStatusDetails?.tx_hash : ""
        }
        error={paymentStatusDetails?.error ?? ""}
      />

      {/* A Deposit link counts down to the Deposit's deadline from the start */}
      {hasExpiry &&
        !closedReason &&
        !isPaid &&
        !showSuccessModal &&
        timeLeftMs > 0 && (
          <PaymentCountdown
            formattedTimeLeft={formattedTimeLeft}
            isUrgent={isUrgent}
          />
        )}

      {paymentSignature === "awaiting" && hasExpiry && timeLeftMs <= 0 && (
        <PaymentExpiredWhileSigningNotice />
      )}
    </div>
  );
};

export default PaymentFlow;
