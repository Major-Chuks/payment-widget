import { apiClient } from "../config";
import { get_paymentDetailsForPayer } from "../types/publicPayments/get_paymentDetailsForPayer";
import { post_checkApprovalAndGetApproveTx } from "../types/publicPayments/post_checkApprovalAndGetApproveTx";
import { post_preparePaymentTransaction } from "../types/publicPayments/post_preparePaymentTransaction";
import { post_submitPaymentTxHash } from "../types/publicPayments/post_submitPaymentTxHash";
import { get_checkPaymentStatus } from "../types/publicPayments/get_checkPaymentStatus";
import { get_cryptoQuote } from "../types/publicPayments/get_cryptoQuote";

interface CheckApprovalAndGetApproveTxPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Cryptocurrency ID (from payment details). */
  cryptocurrency_id: string;
  /** Must be at least 1. */
  quantity?: number;
}

export interface CryptoQuoteParams {
  /** Network ID (from payment details). */
  network_id: string;
  /** Cryptocurrency ID (from payment details). */
  cryptocurrency_id?: string;
  /** Quantity (for multi-sale payments). Default: 1. */
  quantity?: string;
  payer_token_mint?: string;
}

export interface CustomerDataPayload {
  name?: string;
  email?: string;
  phone?: string;
  shipping_address?: string;
  [key: string]: any;
}

interface PreparePaymentTransactionPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Cryptocurrency ID (from payment details). */
  cryptocurrency_id: string;
  /** Must be at least 1. */
  quantity?: number;
  /** Customer details when required by merchant. */
  customer_data?: CustomerDataPayload;
  /** Quote ID from crypto quote endpoint. */
  quote_id: string;
}

interface SubmitPaymentTxHashPayload {
  /** Prepare ID from pay endpoint. */
  prepare_id: string;
  /** Transaction hash. */
  tx_hash: string;
}

export const publicPaymentsApi = {
  /** @description Get payment details for payer */
  get_paymentDetailsForPayer: (
    identifier: string,
  ): Promise<get_paymentDetailsForPayer> =>
    apiClient.get(`/api/v1/pay/${identifier}`),

  /** @description Check approval and get approve tx */
  post_checkApprovalAndGetApproveTx: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: CheckApprovalAndGetApproveTxPayload;
  }): Promise<post_checkApprovalAndGetApproveTx> =>
    apiClient.post(`/api/v1/pay/${identifier}/approve`, payload),

  /** @description Prepare payment transaction */
  post_preparePaymentTransaction: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: PreparePaymentTransactionPayload;
  }): Promise<post_preparePaymentTransaction> =>
    apiClient.post(`/api/v1/pay/${identifier}/pay`, payload),

  /** @description Submit payment tx hash */
  post_submitPaymentTxHash: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: SubmitPaymentTxHashPayload;
  }): Promise<post_submitPaymentTxHash> =>
    apiClient.post(`/api/v1/pay/${identifier}/submit`, payload),

  /** @description Check payment status */
  get_checkPaymentStatus: (
    gatewayPaymentId: string,
  ): Promise<get_checkPaymentStatus> =>
    apiClient.get(`/api/v1/pay/status/${gatewayPaymentId}`),

  /** @description Create a short-lived fiat-to-crypto quote for a specific payment option. @param network_id Network ID (from payment details). @param cryptocurrency_id Cryptocurrency ID (from payment details). @param quantity Quantity (for multi-sale payments). Default: 1. */
  get_cryptoQuote: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: CryptoQuoteParams;
  }): Promise<get_cryptoQuote> =>
    apiClient.get(`/api/v1/pay/${identifier}/quote`, { params }),
};
