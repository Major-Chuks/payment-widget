"use client";

import { type ApiError } from "@/api-services/config";
import { usePostSetTheAmountOnADepositLinkMutation } from "@/api-services/generated/usePaymentDetailsQueries";
import poweredLogo from "@/assets/powered-logo.svg";
import Image from "next/image";
import React, { useState } from "react";
import Button from "../Button/Button";
import styles from "./DepositAmountCard.module.css";

// From deposits-frontend-integration.md, Hosted checkout section 3

interface DepositAmountCardProps {
  /** The charge token, "chg_…". */
  identifier: string;
  merchantName?: string;
  title: string;
  /** Upper-case code, such as "USD". */
  currencyCode: string;
  currencySymbol?: string;
  denomination: "fiat" | "crypto" | string;
  /** The amount is set: the payment details must be fetched again. */
  onAmountSet: () => void;
  /** Another tab set the amount, or the link expired: fetch the details again. */
  onStale: () => void;
  /** The Deposit is inactive, so the API refuses any amount. */
  isInactive?: boolean;
}

const INACTIVE_MESSAGE = "This link is no longer available.";

// The API accepts up to 12 whole digits
const MAX_WHOLE_DIGITS = 12;

const fieldMessage = (error: ApiError) =>
  (
    error.originalError as {
      response?: { data?: { errors?: { amount?: string[] } } };
    }
  )?.response?.data?.errors?.amount?.[0];

/**
 * The first screen of a Deposit link: the payer chooses how much to pay.
 * There's no countdown here; the 20 minutes start once the amount is set.
 */
export const DepositAmountCard: React.FC<DepositAmountCardProps> = ({
  identifier,
  merchantName,
  title,
  currencyCode,
  currencySymbol,
  denomination,
  onAmountSet,
  onStale,
  isInactive = false,
}) => {
  const maxDecimals = denomination === "crypto" ? 8 : 2;
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Errors that a different amount can't fix
  const [blockedError, setBlocked] = useState<string | null>(null);
  const blocked = isInactive ? INACTIVE_MESSAGE : blockedError;
  const setDepositAmount = usePostSetTheAmountOnADepositLinkMutation();

  const handleChange = (value: string) => {
    const pattern = new RegExp(
      `^\\d{0,${MAX_WHOLE_DIGITS}}(\\.\\d{0,${maxDecimals}})?$`,
    );
    if (!pattern.test(value)) return;
    setAmount(value);
    setError(null);
  };

  const handleError = (err: unknown) => {
    const apiError = err as ApiError;
    switch (apiError.statusCode) {
      case 422: {
        const message = fieldMessage(apiError);
        if (message) setError(message);
        // "This payment link is inactive.": the merchant deactivated it
        else setBlocked(INACTIVE_MESSAGE);
        return;
      }
      case 409:
      case 410:
        // Already set in another tab, or expired: the details show which
        onStale();
        return;
      case 403:
        setBlocked(
          apiError.message || "This merchant can't take payments right now.",
        );
        return;
      case 404:
        setBlocked("Link not found.");
        return;
      case 429:
        setError("Too many attempts. Wait a moment, then try again.");
        return;
      default:
        setError("Something went wrong. Try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // "49." is "49"
    const normalized = amount.replace(/\.$/, "");
    if (!normalized || Number(normalized) <= 0) {
      setError("Enter an amount.");
      return;
    }
    setDepositAmount.mutate(
      { identifier, payload: { amount: normalized } },
      { onSuccess: onAmountSet, onError: handleError },
    );
  };

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      {merchantName && (
        <p className={styles.payee}>
          Paying <strong>{merchantName}</strong>
        </p>
      )}

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.hint}>Enter how much you want to pay.</p>

      <label className={styles.label} htmlFor="deposit-amount">
        Amount
      </label>
      <div
        className={`${styles.inputRow} ${error ? styles.inputRowError : ""}`}
      >
        {currencySymbol && (
          <span className={styles.symbol} aria-hidden>
            {currencySymbol}
          </span>
        )}
        <input
          id="deposit-amount"
          className={styles.input}
          inputMode="decimal"
          autoComplete="off"
          placeholder={maxDecimals === 2 ? "0.00" : "0"}
          value={amount}
          onChange={(e) => handleChange(e.target.value)}
          disabled={!!blocked || setDepositAmount.isPending}
          aria-invalid={!!error}
          aria-describedby={error ? "deposit-amount-error" : undefined}
        />
        <span className={styles.code}>{currencyCode}</span>
      </div>
      {error && (
        <p id="deposit-amount-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
      {blocked && (
        <p className={styles.blocked} role="alert">
          {blocked}
        </p>
      )}

      <div className={styles.buttonWrapper}>
        <Button
          type="submit"
          variant="primary"
          loading={setDepositAmount.isPending}
          disabled={!!blocked || !amount || setDepositAmount.isPending}
        >
          CONTINUE
        </Button>
      </div>

      <p className={styles.note}>
        Once you continue, the amount is locked and you have 20 minutes to pay.
      </p>

      <div className={styles.poweredBy}>
        <Image src={poweredLogo} alt="" />
      </div>
    </form>
  );
};

export default DepositAmountCard;
