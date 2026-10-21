"use client";

import React from "react";
import styles from "./PaymentCountdown.module.css";

interface PaymentCountdownProps {
  formattedTimeLeft: string;
  isUrgent?: boolean;
}

export const PaymentCountdown: React.FC<PaymentCountdownProps> = ({
  formattedTimeLeft,
  isUrgent = false,
}) => {
  return (
    <div
      className={`${styles.countdownFloating} ${
        isUrgent ? styles.urgent : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.clockIcon}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        Expires in <strong className={styles.timeText}>{formattedTimeLeft}</strong>
      </span>
    </div>
  );
};
