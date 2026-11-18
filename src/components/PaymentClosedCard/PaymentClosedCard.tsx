"use client";

import React from "react";
import styles from "./PaymentClosedCard.module.css";
import Button from "../Button/Button";
import { formatAddress } from "@/utils";

// Why the payment can no longer take a transaction
export type PaymentClosedReason = "expired" | "paid" | "cancelled" | "failed";

interface PaymentClosedCardProps {
  reason: PaymentClosedReason;
  // Who the customer was paying, for charge checkouts
  merchantName?: string;
  price?: string | number;
  priceDenomination?: string;
  expirationDate?: Date | null;
  identifier?: string;
  // Only known when the payment was made on this page
  paidAmount?: string;
  explorerUrl?: string;
  /** Leave out when there's no merchant page to go back to (e.g. a POS sale). */
  onReturnToMerchant?: () => void;
}

const COPY: Record<PaymentClosedReason, { title: string; description: string }> =
  {
    expired: {
      title: "Payment Expired",
      description:
        "This payment session has expired and can no longer accept transactions. Please return to the merchant to generate a new payment link.",
    },
    paid: {
      title: "Payment Complete",
      description:
        "This payment has been made, so there's nothing more to pay. You can return to the merchant or close this page.",
    },
    cancelled: {
      title: "Payment Cancelled",
      description:
        "The merchant cancelled this payment, so it can no longer be paid. Ask the merchant for a new one if you still want to pay.",
    },
    failed: {
      title: "Payment Failed",
      description:
        "The transaction for this payment failed on the network, so the payment wasn't completed. Ask the merchant for a new one if you still want to pay.",
    },
  };

const ReasonIcon: React.FC<{ reason: PaymentClosedReason }> = ({ reason }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.icon}
    aria-hidden="true"
  >
    {reason === "paid" ? (
      <polyline points="20 6 9 17 4 12" />
    ) : reason === "cancelled" || reason === "failed" ? (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    )}
  </svg>
);

export const PaymentClosedCard: React.FC<PaymentClosedCardProps> = ({
  reason,
  merchantName,
  price,
  priceDenomination,
  expirationDate,
  identifier,
  paidAmount,
  explorerUrl,
  onReturnToMerchant,
}) => {
  const formattedExpiry =
    reason === "expired" && expirationDate
      ? `${expirationDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} at ${expirationDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        <div className={`${styles.iconCircle} ${styles[reason]}`}>
          <ReasonIcon reason={reason} />
        </div>
      </div>

      <h2 className={styles.title}>{COPY[reason].title}</h2>
      <p className={styles.description}>{COPY[reason].description}</p>

      <div className={styles.detailsCard}>
        {merchantName && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Merchant</span>
            <span className={styles.detailValue}>{merchantName}</span>
          </div>
        )}

        {price !== undefined && price !== null && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount</span>
            <span className={styles.detailValue}>
              {Number(price).toFixed(2)} {priceDenomination}
            </span>
          </div>
        )}

        {reason === "paid" && paidAmount && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Paid</span>
            <span className={styles.detailValue}>{paidAmount}</span>
          </div>
        )}

        {formattedExpiry && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Expired at</span>
            <span className={styles.detailValue}>{formattedExpiry}</span>
          </div>
        )}

        {identifier && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Reference</span>
            <span className={styles.detailValue} title={identifier}>
              {formatAddress(identifier)}
            </span>
          </div>
        )}

        {reason === "paid" && explorerUrl && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Transaction</span>
            <a
              className={styles.detailLink}
              href={explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              View on explorer
            </a>
          </div>
        )}
      </div>

      {onReturnToMerchant && (
        <div className={styles.buttonWrapper}>
          <Button variant="primary" onClick={onReturnToMerchant}>
            Return to Merchant
          </Button>
        </div>
      )}
    </div>
  );
};
