type PaymentStatus = "submitted" | "pending" | "confirmed" | "failed";

export interface get_checkPaymentStatus {
  gateway_payment_id: string;
  transaction_ref: string;
  tx_hash: string;
  explorer_url: string;
  status: PaymentStatus;
  amount_paid: string;
  amount_paid_raw: string;
  denomination: string;
  confirmations: number;
  error: string | null;
  confirmed_at: string;
  created_at: string;
}