# Known issues

Issues found on 2026-11-02 while fixing the bug where setting `expires_at` stopped the payment status endpoint being called. They were left out of that fix to keep it small, and none of them are fixed yet.

**How each issue was checked**

- **Reproduced:** seen by running the real `PaymentFlow` with the wallet and API stubbed.
- **From the code:** found by reading the code, not run.

Nothing here has been tested with a real wallet or the real backend.

## How payments work

Keep this in mind when fixing anything below:

- **Non-dynamic links can be paid more than once.** The merchant sets how many times a link can be used. Each payment is its own entity and goes through the same flow, however many times the link has been paid.
- **Dynamic payments (`is_dynamic`) are single charges.** One confirmed payment settles them.

## Summary

| # | Issue | Checked by | Affects |
|---|---|---|---|
| 1 | Quote doesn't load on a fresh page | Reproduced | Every first payment |
| 2 | Expired screen shown after a successful payment | Reproduced | Payments with an expiry |
| 3 | Paid dynamic payments can be paid again | Partly reproduced | Dynamic payments |
| 4 | Balance check can wrongly block Pay | From the code | Payers with slow or failed balance loads, or close to the exact amount |
| 5 | Quote refresh countdown may stall | From the code | Payments with an expiry |
| 6 | Usage limits aren't visible to the widget | From the code | Non-dynamic links with a limit |
| 7 | Status requests can overlap | From the code | Slow status responses |
| 8 | ESLint can't run | Reproduced | Development |

## 1. Quote doesn't load on a fresh page

**What happens:** a payer sees no rate until they click Pay or refresh the quote by hand. No quote is requested on load, and the "Refresh in 60s" countdown doesn't move. The insufficient balance warning also can't appear, because it depends on the quote.

**Cause:** `paymentStatus` starts as `"submitted"` in `useExecutePayment.ts`. In `PaymentFlow.tsx`, the quote query's `enabled` and the `disableQuoteRefresh` prop both treat that status as a payment in progress. The checks were added in `70ca4a7`, whose aim was to stop quotes refreshing during a payment.

**Suggested fix:** remove the two `"submitted"` checks. Nothing sets that status except the initial state, and `isPaying`, `isRefetchingForPay` and the modal checks already cover a payment in progress. This fix hasn't been tested yet.

**Before fixing:** this turns on issues 4 and 5 for every first payment, so handle them together.

## 2. Expired screen shown after a successful payment

**What happens:** if a payer closes the success modal after the deadline, the page shows "Payment Expired". Dynamic payments also send `ORKI_PAYMENT_EXPIRED` to the merchant, even though the payment succeeded.

**Cause:** the page only counts as paid when `pd.charge_status` is `"paid"`, and `pd` isn't refetched after confirmation. Nothing sets `paymentStatus` to `"confirmed"` either, so once the modal closes nothing holds back the expired state.

**Suggested fix:** for dynamic payments only, set `paymentStatus` to `"confirmed"` in `onSuccess` and include that status in `isPaid`. Applying this to non-dynamic links would freeze the quote and countdown for their next payment.

**To decide:** what a non-dynamic link should show here. The expired screen is accurate because the link can't take new payments, but it comes straight after a success message.

## 3. Paid dynamic payments can be paid again

**What happens:** after a dynamic payment is confirmed and the success modal is closed, the form returns with Pay active, and the widget lets a second payment through. Reproduced with the API stubbed, so the backend may still reject it. From the code, the same applies when a page is opened with `charge_status: "paid"`, because `isPaid` only stops the quote and hides the countdown.

**Why it matters:** crypto payments can't be reversed.

**Affected payers:** those who aren't redirected or closed out by the merchant, such as when there's no `redirect_url` or `redirect_option` is `"none"`.

**To decide:** whether dynamic payments should show a paid screen instead of the form. One was tried and left out for now.

**To confirm:** whether the backend rejects a second payment on a settled charge.

## 4. Balance check can wrongly block Pay

**What happens:** the check in `PaymentCard.tsx` can show "Insufficient balance" and disable Pay for a payer who has enough funds, in two ways:

- **Unknown balances count as 0.** `useEVMTransfer` returns 0 for token balances that haven't loaded or failed to load, and `PaymentFlow` falls back to 0 when it can't find a token. The warning should clear once balances load, but a failed load would keep Pay disabled.
- **A fixed `rentFee` of 0.0021 is added for every token, in that token's own units.** A payer with exactly the quoted amount is blocked. On a high-value token, 0.0021 can also be a significant amount.

**Suggested fix:** tell "unknown" apart from a real 0, and apply the rent fee only where it makes sense, in the right units.

## 5. Quote refresh countdown may stall

**What happens:** on payments with an expiry, the countdown may stop ticking and the 60-second quote refresh may not fire. Pay still fetches a new quote, so the payment itself isn't affected.

**Cause:** this is the same pattern as the status polling bug. `useQuoteCountdown` has `onRefresh` in its effect dependencies, and `PaymentFlow` passes a new `refetchQuote` function on every render. The expiry countdown re-renders the page every second, which restarts the timer.

**Suggested fix:** hold `onRefresh` in a ref, as `usePaymentPolling` now does with its callbacks.

**Note:** this currently only shows after a first payment, because of issue 1.

## 6. Usage limits aren't visible to the widget

**What happens:** payment details don't say how many uses a link has left, so the form still returns after the limit is reached.

**To confirm:** whether the backend rejects the next payment, and what the payer sees when it does.

## 7. Status requests can overlap

**What happens:** `usePaymentPolling` sends a request every 5 seconds without waiting for the previous one. If responses take longer than that, two can return "confirmed" and call `onSuccess` twice, which would show a second toast and restart the success timer.

**Suggested fix:** skip a tick while a request is in flight, and ignore responses that arrive after the effect has been cleaned up.

## 8. ESLint can't run

**What happens:** ESLint exits with `ERR_MODULE_NOT_FOUND`. `eslint.config.mjs` imports `eslint-config-next/core-web-vitals`, which doesn't resolve with the installed package. The error suggests importing `eslint-config-next/core-web-vitals.js` instead.
