import { get_paymentDetailsForPayer } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer"
import { toast } from 'sonner'
import { decodeBase64Tx, formatCustomerData } from "@/utils/paymentFormatters"
import { usePostCheckApprovalAndGetApproveTxMutation, usePostPreparePaymentTransactionMutation, usePostSubmitPaymentTxHashMutation } from "@/api-services/generated"
import { useState } from "react"
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config as wagmiConfig } from '@/config'
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import type { Provider } from '@reown/appkit-adapter-solana/react'
import { useSendTransaction } from 'wagmi'
import { useAppKitProvider } from '@reown/appkit/react'

// Updated interface to match your new payload (networkId and tokenId instead of objects)
interface ExecutePaymentParams {
  payerAddress: string
  networkId: string
  tokenId: string
  quoteId: string
  pd: get_paymentDetailsForPayer
  customerInfoData: Record<string, string>
  isSolana: boolean
  identifier: string
}

// 1. Hook no longer takes arguments
export const useExecutePayment = () => {
  const { walletProvider } = useAppKitProvider<Provider>("solana")
  const { connection } = useAppKitConnection()
  const { sendTransactionAsync } = useSendTransaction()

  const [isPaying, setIsPaying] = useState(false)
  const [paymentStep, setPaymentStep] = useState('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'submitted' | 'pending' | 'confirmed' | 'failed'>('submitted')
  const [paymentStatusDetails, setPaymentStatusDetails] = useState<{
    gatewayPaymentId?: string
    transactionRef?: string
    error?: string | null
    txHash?: string
    explorerUrl?: string
  }>({})

  const { mutateAsync: checkApproval } = usePostCheckApprovalAndGetApproveTxMutation()
  const { mutateAsync: preparePayment } = usePostPreparePaymentTransactionMutation()
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation()

  // 2. executePayment now receives the parameters when called
  const executePayment = async ({
    payerAddress,
    networkId,
    tokenId,
    quoteId,
    pd,
    customerInfoData,
    isSolana,
    identifier
  }: ExecutePaymentParams) => {
    setIsPaying(true)

    const formattedCustomerData = formatCustomerData(pd.requires_customer_info, customerInfoData)

    const commonPayload = {
      payer_address: payerAddress,
      network_id: networkId,     // Updated to use the passed ID directly
      cryptocurrency_id: tokenId, // Updated to use the passed ID directly
      quote_id: quoteId,
      quantity: 1,
      ...(formattedCustomerData ? { customer_data: formattedCustomerData } : {}),
    }

    if (isSolana) {
      try {
        setPaymentStep('Preparing Solana payment...')
        const prepareResult = await preparePayment({ identifier, payload: commonPayload })

        setPaymentStep('Awaiting wallet signature...')
        const txBuffer = decodeBase64Tx(prepareResult.payment_tx.tx as unknown as string)

        let transaction: Transaction | VersionedTransaction
        try {
          transaction = VersionedTransaction.deserialize(txBuffer)
        } catch {
          transaction = Transaction.from(txBuffer)
        }

        const signature = await walletProvider!.sendTransaction(
          transaction as any,
          connection as any,
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        )

        setPaymentStep('Finalizing payment...')
        const submitResult = await submitPayment({
          identifier,
          payload: { prepare_id: prepareResult.prepare_id, tx_hash: signature },
        })

        setPaymentStatus(submitResult.status === 'failed' ? 'failed' : 'pending')
        setPaymentStatusDetails({
          gatewayPaymentId: submitResult.gateway_payment_id,
          transactionRef: submitResult.transaction_ref,
          txHash: signature,
        })

        setShowStatusModal(true)
      } catch (err) {
        toast.error('Payment failed: ' + (err as Error).message)
      } finally {
        setIsPaying(false)
        setPaymentStep('')
      }
      return
    }

    // EVM flow
    try {
      setPaymentStep('Checking token approval...')
      const approvalResult = await checkApproval({ identifier, payload: commonPayload })

      if (approvalResult.needs_approval) {
        setPaymentStep('Approving token spend...')
        const { tx } = approvalResult.approve_tx

        // Note: Ensure sendTransactionAsync is defined in scope
        const approveHash = await sendTransactionAsync({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: BigInt(tx.value),
          gas: BigInt(tx.gas),
          chainId: parseInt(tx.chainId, 16),
        })

        setPaymentStep('Waiting for approval confirmation...')
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })
        toast.success('Token approval confirmed!')
      }

      setPaymentStep('Preparing payment...')
      const prepareResult = await preparePayment({ identifier, payload: commonPayload })

      setPaymentStep('Sending payment...')
      const payTx = prepareResult.payment_tx.tx
      const payChainId = parseInt(payTx.chainId, 16)

      const payHash = await sendTransactionAsync({
        to: payTx.to as `0x${string}`,
        data: payTx.data as `0x${string}`,
        value: BigInt(payTx.value),
        gas: BigInt(payTx.gas),
        chainId: payChainId,
      })

      setPaymentStep('Waiting for payment confirmation...')
      await waitForTransactionReceipt(wagmiConfig, { hash: payHash })

      setPaymentStep('Finalizing payment...')
      const submitResult = await submitPayment({
        identifier,
        payload: { prepare_id: prepareResult.prepare_id, tx_hash: payHash },
      })

      setPaymentStatus(submitResult.status === 'failed' ? 'failed' : 'pending')
      setPaymentStatusDetails({
        gatewayPaymentId: submitResult.gateway_payment_id,
        transactionRef: submitResult.transaction_ref,
        txHash: payHash,
      })
      setShowStatusModal(true)
    } catch (e) {
      toast.error('Payment failed: ' + (e as Error).message)
    } finally {
      setIsPaying(false)
      setPaymentStep('')
    }
  }

  return {
    isPaying,
    paymentStep,
    showStatusModal,
    paymentStatus,
    paymentStatusDetails,
    setShowStatusModal,
    setPaymentStatus,
    setPaymentStatusDetails,
    executePayment
  }
}