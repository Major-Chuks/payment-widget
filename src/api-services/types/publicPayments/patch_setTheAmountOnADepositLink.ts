// From swap-configuration-frontend-changes.md ("Deposits checkout: edit
// amount"): the charge after its amount is set or changed. Only the fields the
// document shows are typed; re-fetch the payment details for the rest.
export interface patch_setTheAmountOnADepositLink {
  charge_token: string;
  /** The amount the payer entered, as a decimal string. */
  amount: string;
  price_denomination: "fiat" | "crypto" | string;
  /** "pending" once an amount is set. */
  status: string;
  /** The Deposit's deadline: setting or changing the amount doesn't move it. */
  expires_at: string;
}
