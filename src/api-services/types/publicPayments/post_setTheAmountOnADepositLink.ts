// From deposits-frontend-integration.md (Hosted checkout, section 3): returns
// the charge, now pending. Only the fields the guide names are typed; re-fetch
// the payment details for the rest.
export interface post_setTheAmountOnADepositLink {
  status: string;
  /** The amount the payer entered, as a decimal string. */
  amount: string;
  /** Now + 20 minutes, or the link's expiry if sooner. */
  expires_at: string;
}
