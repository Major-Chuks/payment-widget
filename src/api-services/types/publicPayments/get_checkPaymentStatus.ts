type PaymentStatus = "submitted" | "pending" | "confirmed" | "failed";

export type get_checkPaymentStatus = {
    gateway_payment_id: string;
    transaction_ref: string;
    tx_hash: string | null;
    status: PaymentStatus;
    confirmations: number;
    error: string | null;
    confirmed_at: string | null;
    created_at: string;
    explorer_url: string | null;
}