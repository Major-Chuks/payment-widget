import { type ApiError } from "@/api-services/config";
import { usePatchSetTheAmountOnADepositLinkMutation } from "@/api-services/generated/usePaymentDetailsQueries";
import { useCallback, useEffect, useRef, useState } from "react";

// The payer's amount on a dashboard Deposit link, per
// swap-configuration-frontend-changes.md ("Deposits checkout: edit amount").
// It's entered on the payment screen and sent with PATCH, which sets the first
// amount and changes it until the payment is prepared. Quotes need the amount
// on the backend, so it's sent once the payer stops typing, and again on Pay
// if it changed since

const UNAVAILABLE_MESSAGE = "This link is no longer available.";

// Errors a different amount can't fix, by the API's `reason`
const BLOCKING_REASONS: Record<string, string> = {
  link_inactive: UNAVAILABLE_MESSAGE,
  link_closed: "This link can no longer be paid.",
  merchant_unavailable: "This merchant can't take payments right now.",
  link_not_found: "Link not found.",
};

// The link moved on (paid or expired, or set from another tab before PATCH
// existed): the payment details show where it is now
const STALE_REASONS = new Set([
  "amount_already_set",
  "link_paid",
  "link_expired",
]);

// The API accepts up to 12 whole digits
const MAX_WHOLE_DIGITS = 12;

/** How long after the last keystroke the amount is sent. */
const SEND_DELAY_MS = 700;

/** "049.50" and "49.5" are the same amount. */
export const normalizeAmount = (value: string) => {
  const trimmed = value
    .trim()
    .replace(/\.$/, "")
    .replace(/^0+(?=\d)/, "");
  return trimmed.includes(".")
    ? trimmed.replace(/0+$/, "").replace(/\.$/, "")
    : trimmed;
};

const isSendable = (value: string) => {
  const normalized = normalizeAmount(value);
  return normalized !== "" && Number(normalized) > 0;
};

const errorBody = (error: ApiError) =>
  (
    error.originalError as {
      response?: {
        data?: {
          reason?: string;
          msg?: string;
          errors?: { amount?: string[] };
        };
      };
    }
  )?.response?.data;

interface UseDepositAmountOptions {
  /** The charge token, "chg_…". */
  identifier: string;
  /** Only dashboard Deposit links take the amount from the payer. */
  enabled: boolean;
  /** The amount the backend has: the payment details' price, null before one. */
  savedAmount: string | null;
  denomination: "fiat" | "crypto" | string;
  /** A payment is being prepared, or was: the amount can't change. */
  isLocked: boolean;
  /** The merchant deactivated or deleted the link. */
  isUnavailable: boolean;
  /** The backend has a new amount: fetch the details and a quote again. */
  onAmountChanged: () => void;
  /** The link moved on (paid, expired, confirming): fetch the details again. */
  onStale: () => void;
}

export const useDepositAmount = ({
  identifier,
  enabled,
  savedAmount,
  denomination,
  isLocked,
  isUnavailable,
  onAmountChanged,
  onStale,
}: UseDepositAmountOptions) => {
  const maxDecimals = denomination === "crypto" ? 8 : 2;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Errors that a different amount can't fix
  const [blocked, setBlocked] = useState<string | null>(null);
  // The API said the payment was already prepared
  const [isLockedByServer, setIsLockedByServer] = useState(false);
  const { mutateAsync, isPending } =
    usePatchSetTheAmountOnADepositLinkMutation();

  // Read at send time, so a send queued behind another uses the latest value
  const valueRef = useRef(value);
  // What the backend has, normalized
  const sentRef = useRef<string | null>(null);
  // Sends run one after another, so an older amount can't land last
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callbacks current without re-creating the senders
  const callbacksRef = useRef({ onAmountChanged, onStale });
  useEffect(() => {
    callbacksRef.current = { onAmountChanged, onStale };
  });

  // The backend's amount, on load or changed elsewhere: show it unless the
  // payer is typing something that isn't sent yet
  useEffect(() => {
    const saved = savedAmount ? normalizeAmount(savedAmount) : null;
    const isUntouched =
      normalizeAmount(valueRef.current) === (sentRef.current ?? "");
    sentRef.current = saved;
    if (isUntouched && saved !== normalizeAmount(valueRef.current)) {
      valueRef.current = savedAmount ?? "";
      setValue(savedAmount ?? "");
    }
  }, [savedAmount]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => {
    const timer = timerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Turned back on: a refusal while it was off no longer applies
  useEffect(() => {
    if (!isUnavailable) setBlocked(null);
  }, [isUnavailable]);

  // Routed on the API's `reason`, not its message
  const handleError = useCallback((err: unknown) => {
    const apiError = err as ApiError;
    const body = errorBody(apiError);
    const reason = body?.reason;
    // invalid_amount: below the minimum, or not a valid amount
    const amountMessage =
      body?.errors?.amount?.[0] ??
      (reason === "invalid_amount" ? body?.msg : undefined);

    if (reason === "payment_processing") {
      // Prepared in the meantime (amount_editable was still true when the
      // details loaded): the amount is final
      setIsLockedByServer(true);
      callbacksRef.current.onStale();
    } else if (reason && BLOCKING_REASONS[reason]) {
      setBlocked(BLOCKING_REASONS[reason]);
    } else if (reason && STALE_REASONS.has(reason)) {
      callbacksRef.current.onStale();
    } else if (amountMessage) {
      setError(amountMessage);
    } else if (apiError?.statusCode === 429) {
      setError("Too many attempts. Wait a moment, then try again.");
    } else {
      setError("Couldn't update the amount. Try again.");
    }
  }, []);

  /** Sends the current amount if the backend doesn't have it yet. */
  const sendLatest = useCallback(() => {
    const run = async () => {
      const normalized = normalizeAmount(valueRef.current);
      if (!isSendable(normalized)) return false;
      if (normalized === sentRef.current) return true;
      try {
        await mutateAsync({ identifier, payload: { amount: normalized } });
        sentRef.current = normalized;
        setError(null);
        callbacksRef.current.onAmountChanged();
        return true;
      } catch (err) {
        handleError(err);
        return false;
      }
    };
    const next = queueRef.current.then(run, run);
    queueRef.current = next;
    return next;
  }, [handleError, identifier, mutateAsync]);

  const isDisabled = !enabled || isLocked || isLockedByServer || !!blocked;

  const onChange = (next: string) => {
    if (isDisabled) return;
    const pattern = new RegExp(
      `^\\d{0,${MAX_WHOLE_DIGITS}}(\\.\\d{0,${maxDecimals}})?$`,
    );
    if (!pattern.test(next)) return;
    valueRef.current = next;
    setValue(next);
    setError(null);
    clearTimer();
    if (isSendable(next)) {
      timerRef.current = setTimeout(() => void sendLatest(), SEND_DELAY_MS);
    }
  };

  const onBlur = () => {
    clearTimer();
    if (!isDisabled) void sendLatest();
  };

  /**
   * For Pay: makes sure the backend has the amount on screen. False when
   * there's no valid amount or it couldn't be sent; the field says why.
   */
  const flush = async (): Promise<boolean> => {
    if (!enabled) return true;
    clearTimer();
    if (blocked) return false;
    if (isLocked || isLockedByServer) return true;
    if (!isSendable(valueRef.current)) {
      setError("Enter an amount.");
      return false;
    }
    return sendLatest();
  };

  return {
    value,
    onChange,
    onBlur,
    flush,
    error,
    blocked,
    isSaving: isPending,
    isDisabled,
    /** The payment was prepared (here or before a reload): it's final. */
    isLocked: isLocked || isLockedByServer,
    maxDecimals,
    /** A valid amount is on screen (sent or about to be). */
    hasAmount: isSendable(value),
  };
};
