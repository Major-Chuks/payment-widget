"use client";

import { get_createAShortLivedExchangeRateQuoteForAPayment } from "@/api-services/types/publicPayments/get_createAShortLivedExchangeRateQuoteForAPayment";
import {
  CustomerInfo,
  get_paymentDetailsForPayer,
} from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import poweredLogo from "@/assets/powered-logo.svg";
import qrcodeIcon from "@/assets/qrcode-icon.svg";
import usdcIcon from "@/assets/tokens/usdc.svg";
import WarningIcon from "@/assets/WarningIcon";
import { clipAmount } from "@/utils";
import { testnetName } from "@/utils/networkMapping";
import {
  shouldOfferWalletBrowsers,
  walletBrowserLinks,
  WalletBrowserLink,
} from "@/utils/walletBrowserLinks";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { AdditionalInformation } from "../AdditionalInformation/AdditionalInformation";
import Button from "../Button/Button";
import {
  DropdownSelector,
  SelectorOption,
} from "../DropdownSelector/DropdownSelector";
import { QRCodeModal } from "../QRCodeModal/QRCodeModal";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./PaymentCard.module.css";
import { QuoteRefreshButton } from "./QuoteRefreshButton";

interface PaymentCardProps {
  // Who the customer is paying, for charge checkouts (POS and dynamic links)
  merchantName?: string;
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
  quote?: get_createAShortLivedExchangeRateQuoteForAPayment;
  nativeBalance?: number | null;
  tokenBalance?: number | null;
  nativeSymbol?: string;
  tokenSymbol?: string;
  isNativeToken: boolean;
  tokenBalances?: { symbol: string; balance: number | null }[];
  // Kept back on top of the quoted amount, in the paying asset's own units
  // (e.g. Solana account rent when paying in SOL)
  balanceReserve?: number;
  isQuoteError: boolean;
  quoteError: any;
  onPay: () => void;
  refetchQuote: () => void;
  disableQuoteRefresh?: boolean;
  onConnectWallet: () => void;
  onNetworkSelect: (option: SelectorOption | null) => void;
  onTokenSelect: (option: SelectorOption) => void;
  onCustomerInfoChange: (data: Record<string, string>) => void;
  onValidate: (isValid: boolean) => void;
  /**
   * A Deposit link: the payer enters the amount here, so it replaces the
   * fixed price.
   */
  amountField?: React.ReactNode;
  /** Keeps Pay disabled, for example until the payer enters an amount. */
  isPayBlocked?: boolean;
}
export const PaymentCard: React.FC<PaymentCardProps> = ({
  merchantName,
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
  tokenBalances = [],
  balanceReserve = 0,
  isQuoteError,
  quoteError,
  onPay,
  onValidate,
  refetchQuote,
  disableQuoteRefresh = false,
  onTokenSelect,
  onConnectWallet,
  onNetworkSelect,
  onCustomerInfoChange,
  amountField,
  isPayBlocked = false,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const quoteReady = !!selectedNetwork && !!selectedToken;

  // An unknown balance (still loading, or the read failed) never blocks Pay:
  // the wallet will refuse a payment the payer can't cover
  const compareAmount = isNativeToken ? nativeBalance : tokenBalance;
  const isSufficientBalance =
    !quote ||
    !quoteReady ||
    compareAmount === null ||
    compareAmount === undefined ||
    compareAmount >= Number(quote.target_amount) + balanceReserve;

  const tokens: SelectorOption[] = cryptoOptions.map((opt) => {
    const symUpper = opt.slug.toUpperCase();
    const bal = tokenBalances.find(
      (t) => t.symbol.toLowerCase() === symUpper.toLowerCase(),
    );
    return {
      id: opt.id,
      name: symUpper,
      subtitle: opt.title,
      icon: opt.logo,
      symbol: symUpper,
      networks: opt.networks,
      balance: bal?.balance ?? undefined,
    };
  });

  const selectedCryptoOption = cryptoOptions.find(
    (opt) => opt.id === selectedToken?.id,
  );

  const networks: SelectorOption[] = selectedCryptoOption
    ? selectedCryptoOption.networks.map((net) => ({
        id: net.id,
        name: net.title,
        // On sandbox, the test network the payment really uses ("Base Sepolia")
        subtitle: testnetName(net.slug),
        icon: net.logo,
        symbol: net.slug.toUpperCase(),
        tokenAddress: net.token_address,
      }))
    : [];

  const handleTokenSelect = (token: SelectorOption) => {
    onTokenSelect(token);
    onNetworkSelect(null);
  };

  // Set after mount: they depend on the browser, which the server can't see
  const [walletLinks, setWalletLinks] = useState<WalletBrowserLink[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrentUrl(window.location.href);
    if (shouldOfferWalletBrowsers()) {
      setWalletLinks(walletBrowserLinks(window.location.href));
    }
  }, []);

  const fee = 0;
  const totalPrice = itemPrice + fee;

  if (!isWalletConnected) {
    return (
      <div className={styles.paymentCard}>
        {merchantName && (
          <p className={styles.payee}>
            Paying <strong>{merchantName}</strong>
          </p>
        )}
        <div className={styles.paymentHeader}>
          <span className={styles.usdcIcon}>
            <Image src={usdcIcon} alt="" />
          </span>
          <span>Pay with {priceDenomination}</span>
        </div>
        {amountField ?? (
          <div className={styles.totalPrice}>
            <span className={styles.priceLabel}>Total price</span>
            <div className={styles.priceAmount}>
              {itemPrice.toFixed(2)} {priceDenomination}
            </div>
          </div>
        )}
        <div className={styles.buttonWrapper}>
          <Button variant="primary" onClick={onConnectWallet}>
            CONNECT WALLET
          </Button>
        </div>
        {walletLinks.length > 0 && (
          <div className={styles.walletLinks}>
            <p className={styles.walletLinksLabel}>
              Paying from your phone? Open this page in your wallet app to
              connect and pay without switching apps.
            </p>
            <div className={styles.walletLinkButtons}>
              {walletLinks.map((link) => (
                <a key={link.name} href={link.href} className={styles.walletLink}>
                  Open in {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className={styles.poweredBy}>
          <Image src={poweredLogo} alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paymentCard}>
      {merchantName && (
        <p className={styles.payee}>
          Paying <strong>{merchantName}</strong>
        </p>
      )}
      {amountField}
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
      <br />
      {isWalletConnected &&
        nativeBalance !== null &&
        nativeBalance !== undefined && (
          <div className={styles.balance}>
            <div>
              {isNativeToken ? "Available Balance" : "Network Balance"}{" "}
              <Tooltip text="This balance covers the gas fees required by the network to process your transactions." />{" "}
              :{" "}
              <span>
                {clipAmount(nativeBalance)} {nativeSymbol}
              </span>
            </div>
            {tokenBalance !== null &&
              tokenBalance !== undefined &&
              !isNativeToken && (
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
          <span className={styles.priceLabel}>
            {amountField ? "You pay" : "Total Price"}
          </span>

          {quoteReady && (
            <QuoteRefreshButton
              enabled={quoteReady && !isLoading && !disableQuoteRefresh}
              onRefresh={refetchQuote}
            />
          )}
        </div>

        {/* A Deposit link's amount is in the field above */}
        {!amountField && (
          <div className={styles.totalAmount}>
            {totalPrice.toFixed(2)}{" "}
            <span className={styles.currency}>{priceDenomination}</span>
          </div>
        )}
        {quote ? (
          <>
            <div className={styles.rate}>
              ≈ {clipAmount(quote.target_amount, 4)}{" "}
              {quote.target_currency?.toUpperCase()}{" "}
              {quote.route_cost && "(gas fee included)"}
            </div>

            {quote.route_cost && (
              <div className={styles.gasFeeRowContainer}>
                <hr />
                <div className={styles.gasFeeRow}>
                  <span>Gas Fee:</span> ≈{" "}
                  {clipAmount(quote?.route_cost || "", 2)}{" "}
                  {quote?.target_currency}{" "}
                  <span>(~${clipAmount(quote?.route_cost_usd || "", 2)})</span>
                </div>
              </div>
            )}
          </>
        ) : isQuoteError ? (
          <div className={styles.error}>
            <WarningIcon style={{ flex: "0 0 auto" }} />{" "}
            {quoteError?.message || "Failed to fetch quote"}
          </div>
        ) : amountField && isPayBlocked ? (
          // No amount yet, so there's no quote
          <div className={styles.rate}>
            Enter an amount to see what you&apos;ll pay.
          </div>
        ) : null}
      </div>

      {!isSufficientBalance && (
        <div className={styles.error}>
          <WarningIcon /> Insufficient{" "}
          {isNativeToken ? nativeSymbol : tokenSymbol} balance to pay for this
          transaction
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
          <a
            href="https://www.orki.io/terms-of-service"
            target="_blank"
            rel="noreferrer noopener"
          >
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a
            href="https://www.orki.io/privacy-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Privacy Policy.
          </a>
        </span>
      </div>

      <Button
        variant="primary"
        onClick={isSufficientBalance ? onPay : undefined}
        // Ensures double-clicks are physically disabled while `isLoading` (mapped to isPaying) is true
        disabled={
          isLoading ||
          isPayBlocked ||
          (requiresCustomerInfo && !isFormValid) ||
          !agreedToTerms ||
          !isSufficientBalance
        }
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
