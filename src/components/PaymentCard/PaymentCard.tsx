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
import { get_cryptoQuote } from "@/api-services/types/publicPayments/get_cryptoQuote";
import { clipAmount } from "@/utils";
import { QuoteRefreshButton } from "./QuoteRefreshButton";

interface PaymentCardProps {
  isWalletConnected: boolean;
  itemPrice: number;
  priceDenomination: string;
  cryptoOptions: get_paymentDetailsForPayer["crypto_options"];
  selectedNetwork: SelectorOption | null;
  selectedToken: SelectorOption | null;
  isLoading?: boolean;
  loadingText?: string;
  requiresCustomerInfo: boolean;
  customerInfo: CustomerInfo;
  isFormValid: boolean;
  quote?: get_cryptoQuote;
  nativeBalance?: number | null;
  tokenBalance?: number | null;
  nativeSymbol?: string;
  tokenSymbol?: string;
  isNativeToken: boolean;
  onPay: () => void;
  refetchQuote: () => void;
  onConnectWallet: () => void;
  onNetworkSelect: (option: SelectorOption | null) => void;
  onTokenSelect: (option: SelectorOption) => void;
  onCustomerInfoChange: (data: Record<string, string>) => void;
  onValidate: (isValid: boolean) => void;

}
export const PaymentCard: React.FC<PaymentCardProps> = ({
  isWalletConnected,
  itemPrice,
  priceDenomination,
  cryptoOptions,
  selectedNetwork,
  selectedToken,
  isLoading = false,
  loadingText,
  requiresCustomerInfo,
  customerInfo,
  isFormValid,
  quote,
  nativeBalance,
  tokenBalance,
  nativeSymbol,
  tokenSymbol,
  isNativeToken,
  onPay,
  onValidate,
  refetchQuote,
  onTokenSelect,
  onConnectWallet,
  onNetworkSelect,
  onCustomerInfoChange,
}) => {

  const [showQRModal, setShowQRModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const quoteReady = !!selectedNetwork && !!selectedToken;

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
      symbol: net.slug.toUpperCase(),
    }))
    : [];

  const handleTokenSelect = (token: SelectorOption) => {
    onTokenSelect(token);
    onNetworkSelect(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") setCurrentUrl(window.location.href);
  }, []);

  const fee = 0;
  const totalPrice = itemPrice + fee;

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

      {isWalletConnected && (nativeBalance !== null && nativeBalance !== undefined) && (
        <div className={styles.balance}>
          <div>
            {isNativeToken ? "Available Balance" : "Network Balance"}:{" "}
            <span>
              {clipAmount(nativeBalance)} {nativeSymbol}
            </span>
          </div>
          {tokenBalance !== null && tokenBalance !== undefined && !isNativeToken && (
            <div>
              {selectedToken?.name} Balance:{" "}
              <span>
                {clipAmount(tokenBalance)} {tokenSymbol}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Total Price</span>

          {quoteReady && <QuoteRefreshButton enabled={quoteReady} onRefresh={refetchQuote} />}
        </div>

        <div className={styles.totalAmount}>
          {totalPrice.toFixed(2)}{" "}
          <span className={styles.currency}>{priceDenomination}</span>
        </div>

        {quote && (
          <div className={styles.rate}>
            ≈ {clipAmount(quote.rate, 6)} {quote.target_currency?.toUpperCase()}
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