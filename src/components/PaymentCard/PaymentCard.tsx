import React, { useState } from "react";
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
import solIcon from "@/assets/tokens/sol.svg";
import ethIcon from "@/assets/tokens/eth.svg";
import maticIcon from "@/assets/tokens/matic.svg";

interface PaymentCardProps {
  isWalletConnected: boolean;
  itemPrice: number;
  balance: string;
  balanceSymbol: string;
  onConnectWallet: () => void;
  onPay: () => void;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  isWalletConnected,
  itemPrice,
  balance,
  balanceSymbol,
  onConnectWallet,
  onPay,
}) => {
  const tokens: SelectorOption[] = [
    {
      id: "usdc",
      name: "USDC",
      subtitle: "USD Coin",
      icon: usdcIcon.src,
      balance: 150,
      symbol: "USDC",
    },
    {
      id: "sol",
      name: "SOL",
      subtitle: "Solana",
      icon: solIcon.src,
      balance: 5.2,
      symbol: "SOL",
    },
    {
      id: "eth",
      name: "ETH",
      subtitle: "Ethereum",
      icon: ethIcon.src,
      balance: 0.5,
      symbol: "ETH",
    },
    {
      id: "matic",
      name: "MATIC",
      subtitle: "Polygon",
      icon: maticIcon.src,
      balance: 200,
      symbol: "MATIC",
    },
  ];

  const networks: SelectorOption[] = [
    { id: "solana", name: "Solana", icon: solIcon.src },
    { id: "ethereum", name: "Ethereum", icon: ethIcon.src },
    { id: "polygon", name: "Polygon", icon: maticIcon.src },
  ];

  const [selectedToken, setSelectedToken] = useState<SelectorOption>(tokens[0]);
  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption>(
    networks[0]
  );
  const [showQRModal, setShowQRModal] = useState(false);
  const fee = 2.5;
  const totalPrice = itemPrice + fee;

  if (!isWalletConnected) {
    return (
      <div className={styles.paymentCard}>
        <div className={styles.paymentHeader}>
          <span className={styles.usdcIcon}>💵</span>
          <span>Pay with USDC</span>
        </div>
        <div className={styles.totalPrice}>
          <span className={styles.priceLabel}>Total price</span>
          <div className={styles.priceAmount}>${itemPrice.toFixed(2)} USDC</div>
        </div>
        <Button variant="primary" onClick={onConnectWallet}>
          CONNECT WALLET
        </Button>
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
          onSelect={setSelectedToken}
          label="Pay with"
        />

        <DropdownSelector
          options={networks}
          selectedOption={selectedNetwork}
          onSelect={setSelectedNetwork}
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
          <span className={styles.expiryTime}>
            <RefreshIcon /> 30s
          </span>
        </div>
        <div className={styles.totalAmount}>
          {totalPrice.toFixed(2)} <span className={styles.currency}>USDC</span>
        </div>
        <div className={styles.feeInfo}>
          ≈ ${fee.toFixed(2)} ({itemPrice} USDC)
        </div>
      </div>

      {false && (
        <div className={styles.error}>
          <WarningIcon /> Insufficient USDC balance to create token account
        </div>
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

      <Button variant="primary" onClick={onPay}>
        PAY
      </Button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <Button variant="secondary" onClick={() => setShowQRModal(true)}>
        <Image src={qrcodeIcon} alt="" />
        <div> Pay with QR Code</div>
      </Button>

      <div className={styles.divider}></div>

      <QRCodeModal open={showQRModal} onOpenChange={setShowQRModal} />

      <div className={styles.poweredBy}>
        <Image src={poweredLogo} alt="" />
      </div>
    </div>
  );
};
