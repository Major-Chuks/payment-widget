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
import RefreshIcon from "@/assets/RefreshIcon";
import WarningIcon from "@/assets/WarningIcon";
import usdcIcon from "@/assets/tokens/usdc.svg";

import { AdditionalInformation } from "../AdditionalInformation/AdditionalInformation";
import { CustomerInfo, get_paymentDetailsForPayer } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";

interface PaymentCardProps {
  isWalletConnected: boolean;
  itemPrice: number;
  priceDenomination: string;
  balance: string;
  balanceSymbol: string;
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
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  isWalletConnected,
  itemPrice,
  priceDenomination,
  balance,
  balanceSymbol,
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
}) => {
  const tokens: SelectorOption[] = cryptoOptions.map((opt) => ({
    id: opt.id,
    name: opt.slug.toUpperCase(),
    subtitle: opt.title,
    icon: opt.logo,
    symbol: opt.slug.toUpperCase(),
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
    onNetworkSelect(null); // Reset network when token changes.
  };
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);
  const fee = 2.5;
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
            ${itemPrice.toFixed(2)} {priceDenomination}
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
        Wallet Balance:{" "}
        <span>
          {balance} {balanceSymbol}
        </span>
      </div>

      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Total Price</span>
          <Button>
            <span className={styles.expiryTime}>
              <RefreshIcon /> 30s
            </span>
          </Button>
        </div>
        <div className={styles.totalAmount}>
          {totalPrice.toFixed(2)}{" "}
          <span className={styles.currency}>{priceDenomination}</span>
        </div>
        <div className={styles.feeInfo}>
          ≈ ${fee.toFixed(2)} ({itemPrice} {priceDenomination})
        </div>
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
        <input style={{ width: "16px", height: "16px" }} type="checkbox" />{" "}
        <span>
          I agree to the{" "}
          <a
            href="https://orki-money.vercel.app/terms-of-use"
            target="_blank"
            rel="noreferrer noopener"
          >
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a
            href="https://orki-money.vercel.app/privacy-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Privacy Policy.
          </a>
        </span>
      </div>

      <Button variant="primary" onClick={onPay} disabled={isLoading || (requiresCustomerInfo && !isFormValid)}>
        {isLoading ? (loadingText || "PROCESSING...") : "PAY"}
      </Button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <Button variant="secondary" onClick={() => setShowQRModal(true)}>
        <Image src={qrcodeIcon} alt="" />
        <div> Pay with QR Code</div>
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
