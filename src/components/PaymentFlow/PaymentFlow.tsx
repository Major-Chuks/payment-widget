'use client'

import React, { useState, useEffect } from 'react'
import styles from './PaymentFlow.module.css'
import { useParams } from 'next/navigation'
import { useAppKit, useAppKitNetwork, useDisconnect } from '@reown/appkit/react'
import { toast, Toaster } from 'sonner'
import { useGetCryptoQuoteQuery, useGetPaymentDetailsForPayerQuery } from '@/api-services/generated'
import { Header } from '../Header/Header'
import { ProductCard } from '../ProductCard/ProductCard'
import { PaymentCard } from '../PaymentCard/PaymentCard'
import { SuccessModal } from '../SuccessModal/SuccessModal'
import { PaymentStatusModal } from '../PaymentStatusModal/PaymentStatusModal'
import { LoadingState } from '../LoadingState/LoadingState'
import { ErrorState } from '../ErrorState/ErrorState'
import { SelectorOption } from '../DropdownSelector/DropdownSelector'
import { findAppKitNetwork } from '@/utils/networkMapping'
import { useExecutePayment } from './useExecutePayment'
import { useTransfer } from '@/hooks/useTransfer'
import { formatBackendTokens } from '@/utils/paymentFormatters'
import { usePaymentPolling } from '@/hooks/usePaymentPolling'

const PaymentFlow: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<SelectorOption | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption | null>(null)
  const [customerInfoData, setCustomerInfoData] = useState<Record<string, string>>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const params = useParams()
  const identifier = params?.identifier as string
  const { data: pd, isLoading, isError } = useGetPaymentDetailsForPayerQuery(identifier)

  const {
    address, nativeBalance, nativeSymbol,
    tokenBalances, isConnected, chain,
  } = useTransfer({
    solanaTokens: formatBackendTokens(pd?.crypto_options ?? []).solanaTokens,
    evmTokens: formatBackendTokens(pd?.crypto_options ?? []).evmTokens
  });

  const { open } = useAppKit()
  const { switchNetwork } = useAppKitNetwork()
  const { disconnect } = useDisconnect();

  const tokenBalance = tokenBalances.find(t => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase())?.balance ?? 0
  const tokenSymbol = tokenBalances.find(t => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase())?.symbol ?? ''

  const {
    isPaying,
    paymentStep,
    showStatusModal,
    paymentStatus,
    paymentStatusDetails,
    setShowStatusModal,
    setPaymentStatus,
    setPaymentStatusDetails,
    executePayment,
  } = useExecutePayment()

  const { data: quote, refetch: refetchQuote } = useGetCryptoQuoteQuery(
    {
      identifier,
      params: {
        network_id: selectedNetwork?.id ?? '',
        cryptocurrency_id: selectedToken?.id ?? '',
      },
    },
    { enabled: !!selectedNetwork && !!selectedToken }
  )

  const recipientAddress = selectedNetwork && pd
    ? pd.recipients.find(r => r.network.id === selectedNetwork.id)?.wallet_address ?? ''
    : ''

  const handleConnectWallet = async () => {
    try {
      await disconnect();
      open();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTokenSelect = (token: SelectorOption) => {
    setSelectedToken(token)
    setSelectedNetwork(null)
  }

  const handleNetworkSelect = (option: SelectorOption | null) => {
    setSelectedNetwork(option)
  }

  const handlePay = () => {
    if (!address) {
      toast.error("Please connect your wallet")
      return
    }

    if (!selectedNetwork?.id) {
      toast.error("Please select a network")
      return
    }

    if (!selectedToken?.id) {
      toast.error("Please select a token")
      return
    }

    if (!quoteId) {
      toast.error("Please refresh quote")
      return
    }

    if (!pd) {
      toast.error("Payment details not found")
      return
    }

    executePayment({
      payerAddress: address,
      networkId: selectedNetwork?.id,
      tokenId: selectedToken?.id,
      quoteId: quoteId,
      pd,
      customerInfoData,
      isSolana: chain?.toLowerCase() === 'solana',
      identifier
    })
  }

  usePaymentPolling({
    showStatusModal,
    paymentStatus,
    gatewayPaymentId: paymentStatusDetails.gatewayPaymentId,
    onSuccess: ({ txHash, explorerUrl }) => {
      setShowStatusModal(false);
      setPaymentStatusDetails((prev) => ({ ...prev, txHash, explorerUrl }));
      setShowSuccessModal(true);
      toast.success("Payment confirmed!");
    },
    onFail: (error, txHash) => {
      setPaymentStatus("failed");
      setPaymentStatusDetails((prev) => ({ ...prev, error, txHash }));
    },
  });

  // Auto-select first token on load
  useEffect(() => {
    if (!pd?.crypto_options?.[0] || selectedToken) return
    const opt = pd.crypto_options[0]
    setSelectedToken({
      id: opt.id,
      name: opt.slug.toUpperCase(),
      subtitle: opt.title,
      icon: opt.logo,
      symbol: opt.slug.toUpperCase(),
      networks: opt.networks,
    })
  }, [pd])


  // Switch AppKit network once when selectedNetwork is set
  useEffect(() => {
    if (!selectedNetwork) return

    const appKitNetwork = findAppKitNetwork(selectedNetwork.name)
    if (!appKitNetwork) {
      toast.error("Selected network is not supported")
      return
    }

    switchNetwork(appKitNetwork)
      .then(() => console.log("Network switched successfully"))
      .catch(err => console.error('Network switch failed:', err))
  }, [selectedNetwork])

  useEffect(() => {
    if (quote) setQuoteId(quote.quote_id)
  }, [quote])

  if (isLoading) return <LoadingState />
  if (!pd || isError) return (
    <ErrorState
      message="Failed to load payment details."
      onRetry={() => window.location.reload()}
    />
  )

  return (
    <div className={styles.paymentContainer}>
      <Toaster position="top-center" richColors />

      <Header
        isWalletConnected={isConnected}
        connectedWallet=""
        walletAddress={address ?? ''}
      />

      <div className={styles.content}>
        <ProductCard
          recipient={recipientAddress}
          title={pd.product_title}
          description={pd.description}
          images={pd.images}
        />

        <PaymentCard
          isWalletConnected={isConnected}
          itemPrice={Number(pd.price) || 0}
          priceDenomination={(
            pd.price_denomination_asset.slug ||
            pd.price_denomination_asset.code ||
            ''
          ).toUpperCase()}
          onConnectWallet={handleConnectWallet}
          quote={quote}
          refetchQuote={() => {
            if (!showStatusModal && !isPaying) refetchQuote()
          }}
          onPay={handlePay}
          isLoading={isPaying}
          loadingText={paymentStep}
          cryptoOptions={pd.crypto_options}
          selectedNetwork={selectedNetwork}
          onNetworkSelect={handleNetworkSelect}
          selectedToken={selectedToken}
          onTokenSelect={handleTokenSelect}
          requiresCustomerInfo={pd.requires_customer_info}
          customerInfo={pd.customer_info}
          onCustomerInfoChange={setCustomerInfoData}
          isFormValid={isFormValid}
          onValidate={setIsFormValid}
          nativeBalance={nativeBalance}
          nativeSymbol={nativeSymbol}
          tokenBalance={tokenBalance}
          tokenSymbol={tokenSymbol}
          isNativeToken={selectedToken?.symbol?.toLowerCase() === nativeSymbol.toLowerCase()}
        />
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        amount={pd.price}
        network={selectedNetwork?.name ?? ''}
        tokenSymbol={selectedToken?.symbol ?? ''}
        txHash={paymentStatusDetails.txHash ?? ''}
        fromAddress={address ?? ''}
        toAddress={recipientAddress}
        explorerUrl={paymentStatusDetails.explorerUrl ?? ''}
      />

      <PaymentStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onRetry={() => {
          setShowStatusModal(false)
          handlePay()
        }}
        status={paymentStatus}
        gatewayPaymentId={paymentStatusDetails.gatewayPaymentId ?? ''}
        transactionRef={paymentStatusDetails.transactionRef ?? ''}
        error={paymentStatusDetails.error ?? ''}
      />
    </div>
  )
}

export default PaymentFlow
