export type post_preparePaymentTransaction = {
    prepare_id: string;
    payment_tx: PaymentTx;
    merchant_wallet: string;
    token: string;
    amount: string;
}

interface TransactionTx {
    from: string;
    to: string;
    data: string;
    value: string;
    nonce: string;
    gas: string;
    chainId: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
}

interface TransactionMeta {
    network: string;
    networkName: string;
    action: string;
    merchantWallet: string;
    token: string;
    isNativePayment: boolean;
    amount: string;
}

interface PaymentTx {
    signingMethod: string;
    tx: TransactionTx;
    meta: TransactionMeta;
}

