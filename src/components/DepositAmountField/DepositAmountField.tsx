"use client";

import React from "react";
import styles from "./DepositAmountField.module.css";

interface DepositAmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Upper-case code, such as "USD". */
  currencyCode: string;
  currencySymbol?: string;
  maxDecimals: number;
  disabled: boolean;
  /** The amount was prepared for payment, so it can't change any more. */
  isLocked: boolean;
  error: string | null;
  /** An error a different amount can't fix. */
  blocked: string | null;
}

/**
 * Where the payer of a Deposit link enters how much to pay, on the payment
 * card. They can change it until they pay.
 */
export const DepositAmountField: React.FC<DepositAmountFieldProps> = ({
  value,
  onChange,
  onBlur,
  currencyCode,
  currencySymbol,
  maxDecimals,
  disabled,
  isLocked,
  error,
  blocked,
}) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor="deposit-amount">
      Amount
    </label>
    <div className={`${styles.inputRow} ${error ? styles.inputRowError : ""}`}>
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? "deposit-amount-error" : undefined}
      />
      <span className={styles.code}>{currencyCode}</span>
    </div>
    {error ? (
      <p id="deposit-amount-error" className={styles.error} role="alert">
        {error}
      </p>
    ) : blocked ? (
      <p className={styles.blocked} role="alert">
        {blocked}
      </p>
    ) : (
      <p className={styles.hint}>
        {isLocked
          ? "The amount is locked because the payment has started."
          : "Enter how much you want to pay. You can change it until you pay."}
      </p>
    )}
  </div>
);

export default DepositAmountField;
