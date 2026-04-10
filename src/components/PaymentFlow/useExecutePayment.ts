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
import { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus"

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

export const useExecutePayment = () => {
  const { walletProvider } = useAppKitProvider<Provider>("solana")
  const { connection } = useAppKitConnection()
  const { sendTransactionAsync } = useSendTransaction()

  const [isPaying, setIsPaying] = useState(false)
  const [paymentStep, setPaymentStep] = useState('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'submitted' | 'pending' | 'confirmed' | 'failed'>('submitted')
  const [paymentStatusDetails, setPaymentStatusDetails] = useState<Partial<get_checkPaymentStatus> | null>(null)

  const { mutateAsync: checkApproval } = usePostCheckApprovalAndGetApproveTxMutation()
  const { mutateAsync: preparePayment } = usePostPreparePaymentTransactionMutation()
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation()

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
    // 1. ROBUST FIX: Strict Guard Clause to prevent double execution
    if (isPaying) {
      console.warn('[Payment Execution Blocked] A transaction is already in progress.');
      return;
    }
    
    setIsPaying(true)

    const formattedCustomerData = formatCustomerData(pd.requires_customer_info, customerInfoData)

    const commonPayload = {
      payer_address: payerAddress,
      network_id: networkId,
      cryptocurrency_id: tokenId,
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

        let signature: string = '';
        
        try {
          console.log('[Solana Tx] Requesting signature and broadcasting...');
          
          // 2. ROBUST FIX: Adjusting RPC parameters to prevent simulation collision
          signature = await walletProvider!.sendTransaction(
            transaction as any,
            connection as any,
            { 
              skipPreflight: true, // Prevents RPC simulation which throws the false "already processed" error
              preflightCommitment: 'confirmed',
              maxRetries: 0 // Stops aggressive library retries that cause duplicates
            }
          );
          console.log('[Solana Tx] Successfully broadcasted. Signature:', signature);
          
        } catch (sendError: any) {
          // 3. ROBUST FIX: Deep logging to catch it if it somehow reoccurs
          console.error('[Solana Tx Error] Full Error Object:', sendError);
          
          if (sendError.logs) {
            console.error('[Solana Tx Error] Transaction Logs:', sendError.logs);
          }

          const errorMessage = sendError?.message || String(sendError);
          if (errorMessage.includes('already been processed')) {
             console.warn('[Solana Tx Sync] Caught "already processed" error. The transaction likely succeeded on-chain, but the client RPC panicked.');
             // We throw a cleaner error here to prevent passing an empty signature to the backend
             throw new Error("Transaction processed successfully, but encountered a sync delay. Please check your wallet history.");
          }
          
          throw sendError; // Re-throw standard user rejections/insufficient funds
        }

        setPaymentStep('Finalizing payment...')
        const submitResult = await submitPayment({
          identifier,
          payload: { prepare_id: prepareResult.prepare_id, tx_hash: signature },
        })

        setPaymentStatus(submitResult.status === 'failed' ? 'failed' : 'pending')
        setPaymentStatusDetails({
          gateway_payment_id: submitResult.gateway_payment_id,
          transaction_ref: submitResult.transaction_ref,
          tx_hash: signature,
        })

        setShowStatusModal(true)
      } catch (err) {
        console.error('[Solana Payment Flow] Failed:', err);
        toast.error('Payment failed: ' + (err as Error).message)
      } finally {
        setIsPaying(false)
        setPaymentStep('')
      }
      return
    }

    // EVM flow (Kept exact same)
    try {
      setPaymentStep('Checking token approval...')
      const approvalResult = await checkApproval({ identifier, payload: commonPayload })

      if (approvalResult.needs_approval) {
        setPaymentStep('Approving token spend...')
        const { tx } = approvalResult.approve_tx

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
        gateway_payment_id: submitResult.gateway_payment_id,
        transaction_ref: submitResult.transaction_ref,
        tx_hash: payHash,
      })
      setShowStatusModal(true)
    } catch (e) {
      console.error('[EVM Payment Flow] Failed:', e);
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