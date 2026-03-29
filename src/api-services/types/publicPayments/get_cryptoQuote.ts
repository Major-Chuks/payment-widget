export type get_cryptoQuote = {
    quote_id: string;
    source_amount: string;
    source_currency: string;
    source_type: "fiat" | "crypto";
    target_amount: string;
    target_amount_raw: string;
    target_currency: string;
    rate: string;
    expires_at: string;
}