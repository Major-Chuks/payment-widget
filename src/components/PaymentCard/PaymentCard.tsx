"use client";

import React, { useState, useEffect } from "react";
import styles from "./PaymentCard.module.css";
import poweredLogo from "@/assets/powered-logo.svg";
import Image from "next/image";
import Button from "../Button/Button";
import {
  DropdownSelector,
  SelectorOption,
} from "../DropdownSelector/DropdownSelector";
import { QRCodeModal } from "../QRCodeModal/QRCodeModal";
import qrcodeIcon from "@/assets/qrcode-icon.svg";
import WarningIcon from "@/assets/WarningIcon";
import usdcIcon from "@/assets/tokens/usdc.svg";
import { AdditionalInformation } from "../AdditionalInformation/AdditionalInformation";
import { CustomerInfo, get_paymentDetailsForPayer } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import { useConfig, useConnection } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { get_cryptoQuote } from "@/api-services/types/publicPayments/get_cryptoQuote";
import { useQuoteCountdown } from "@/hooks/useQuoteCountdown";
import { clipAmount } from "@/utils";

interface PaymentCardProps {
  isWalletConnected: boolean;
  itemPrice: number;
  priceDenomination: string;
  cryptoOptions: get_paymentDetailsForPayer["crypto_options"];
  onConnectWallet: () => void;
  onPay: () => void;
  selectedNetwork: SelectorOption | null;
  onNetworkSelect: (option: SelectorOption | null) => void;
  selectedToken: SelectorOption | null;
  onTokenSelect: (option: SelectorOption) => void;
  isLoading?: boolean;
  loadingText?: string;
  requiresCustomerInfo: boolean;
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (data: Record<string, string>) => void;
  isFormValid: boolean;
  onValidate: (isValid: boolean) => void;
  quote?: get_cryptoQuote;
  refetchQuote: () => void;
}

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const PaymentCard: React.FC<PaymentCardProps> = ({
  isWalletConnected,
  itemPrice,
  priceDenomination,
  cryptoOptions,
  onConnectWallet,
  onPay,
  selectedNetwork,
  onNetworkSelect,
  selectedToken,
  onTokenSelect,
  isLoading = false,
  loadingText,
  requiresCustomerInfo,
  customerInfo,
  onCustomerInfoChange,
  isFormValid,
  onValidate,
  quote,
  refetchQuote,
}) => {
  const { address, chainId } = useConnection();
  const config = useConfig();

  const [tokenAddress, setTokenAddress] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const quoteReady = !!selectedNetwork && !!selectedToken;

  const { secondsLeft, progress, refresh } = useQuoteCountdown({
    intervalMs: 30000,
    onRefresh: refetchQuote,
    enabled: quoteReady,
  });

  // Native (ETH/SOL) balance
  const {
    balance: nativeBalance,
    symbol: nativeSymbol,
    isPending: isNativeBalancePending,
    fetchBalance: fetchNativeBalance,
  } = useTokenBalance({
    address: address || "",
    chainId: chainId || 1,
    config,
  });

  // ERC-20 / SPL token balance
  const {
    balance: tokenBalance,
    symbol: tokenSymbol,
    isPending: isTokenBalancePending,
    fetchBalance: fetchTokenBalance,
  } = useTokenBalance({
    address: address || "",
    chainId: chainId || 1,
    config,
    contractAddress: tokenAddress || undefined,
  });

  const tokens: SelectorOption[] = cryptoOptions.map((opt) => ({
    id: opt.id,
    name: opt.slug.toUpperCase(),
    subtitle: opt.title,
    icon: opt.logo,
    symbol: opt.slug.toUpperCase(),
    networks: opt.networks,
  }));

  const selectedCryptoOption = cryptoOptions.find(
    (opt) => opt.id === selectedToken?.id,
  );

  const networks: SelectorOption[] = selectedCryptoOption
    ? selectedCryptoOption.networks.map((net) => ({
      id: net.id,
      name: net.title,
      icon: net.logo,
    }))
    : [];

  const handleTokenSelect = (token: SelectorOption) => {
    onTokenSelect(token);
    onNetworkSelect(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (isWalletConnected && address) fetchNativeBalance();
  }, [isWalletConnected, address, chainId, fetchNativeBalance]);

  useEffect(() => {
    if (selectedToken && selectedNetwork) {
      const addr = selectedToken.networks?.find(
        (net) => net.id === selectedNetwork.id,
      )?.token_address ?? "";
      setTokenAddress(addr);
    } else {
      setTokenAddress("");
    }
  }, [selectedToken, selectedNetwork]);

  useEffect(() => {
    if (tokenAddress) fetchTokenBalance();
  }, [tokenAddress, fetchTokenBalance]);

  const fee = 0;
  const totalPrice = itemPrice + fee;

  // Full circle → empty as time elapses
  const strokeDashoffset = CIRCUMFERENCE * progress;

  if (!isWalletConnected) {
    return (
      <div className={styles.paymentCard}>
        <div className={styles.paymentHeader}>
          <span className={styles.usdcIcon}>
            <Image src={usdcIcon} alt="" />
          </span>
          <span>Pay with {priceDenomination}</span>
        </div>
        <div className={styles.totalPrice}>
          <span className={styles.priceLabel}>Total price</span>
          <div className={styles.priceAmount}>
            {itemPrice.toFixed(2)} {priceDenomination}
          </div>
        </div>
        <div className={styles.buttonWrapper}>
          <Button variant="primary" onClick={onConnectWallet}>
            CONNECT WALLET
          </Button>
        </div>
        <div className={styles.poweredBy}>
          <Image src={poweredLogo} alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paymentCard}>
      <div className={styles.dropdownWrapper}>
        <DropdownSelector
          options={tokens}
          selectedOption={selectedToken}
          onSelect={handleTokenSelect}
          label="Pay with"
        />

        <DropdownSelector
          options={networks}
          selectedOption={selectedNetwork}
          onSelect={onNetworkSelect}
          label="Network"
        />
      </div>

      <div className={styles.balance}>
        <div>
          Network Balance:{" "}
          <span>
            {isNativeBalancePending ? "Loading..." : `${clipAmount(nativeBalance)} ${nativeSymbol}`}
          </span>
        </div>
        {tokenBalance !== undefined && (
          <div>
            Token Balance:{" "}
            <span>
              {isTokenBalancePending ? "Loading..." : `${clipAmount(tokenBalance)} ${tokenSymbol}`}
            </span>
          </div>
        )}
      </div>

      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Total Price</span>

          {quoteReady && (
            <button
              type="button"
              className={styles.refreshButton}
              onClick={refresh}
            >
              <svg
                className={styles.countdownRing}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx="10"
                  cy="10"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="2"
                  className={styles.countdownTrack}
                />
                {/* Draining arc */}
                <circle
                  cx="10"
                  cy="10"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  className={styles.countdownArc}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
              </svg>
              <span className={styles.countdownLabel}>{secondsLeft}s</span>
            </button>
          )}
        </div>

        <div className={styles.totalAmount}>
          {totalPrice.toFixed(2)}{" "}
          <span className={styles.currency}>{priceDenomination}</span>
        </div>

        {quote && (
          <div className={styles.rate}>
            ≈ {Number(quote.rate)?.toFixed(2)} {quote.target_currency?.toUpperCase()}
          </div>
        )}
      </div>

      {false && (
        <div className={styles.error}>
          <WarningIcon /> Insufficient {priceDenomination} balance to create
          token account
        </div>
      )}

      {requiresCustomerInfo && (
        <>
          <div className={styles.separator}></div>
          <AdditionalInformation
            customerInfo={customerInfo}
            onChange={onCustomerInfoChange}
            onValidate={onValidate}
          />
        </>
      )}

      <div className={styles.terms}>
        <input
          style={{ width: "16px", height: "16px" }}
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
        />{" "}
        <span>
          I agree to the{" "}
          <a href="https://orki-money.vercel.app/terms-of-use" target="_blank" rel="noreferrer noopener">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="https://orki-money.vercel.app/privacy-policy" target="_blank" rel="noreferrer noopener">
            Privacy Policy.
          </a>
        </span>
      </div>

      <Button
        variant="primary"
        onClick={onPay}
        disabled={isLoading || (requiresCustomerInfo && !isFormValid) || !agreedToTerms}
      >
        {isLoading ? loadingText || "PROCESSING..." : "PAY"}
      </Button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <Button variant="secondary" onClick={() => setShowQRModal(true)}>
        <Image src={qrcodeIcon} alt="" />
        <div>Pay with QR Code</div>
      </Button>

      <div className={styles.divider}></div>

      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        qrCodeUrl={currentUrl}
      />

      <div className={styles.poweredBy}>
        <Image src={poweredLogo} alt="" />
      </div>
    </div>
  );
};