/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from "react";
import {
  useConnection,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { BaseError, erc20Abi, parseEther, parseUnits } from "viem";

export interface TransferParams {
  toAddress: string;
  amount: string;
  tokenContract?: string; // If undefined, transfers native token
}

export interface UseTransferReturn {
  transfer: (params: TransferParams) => Promise<void>;
  isTransferring: boolean;
  isWaitingForReceipt: boolean;
  isSuccess: boolean;
  transactionHash?: string;
  receipt?: any;
  error?: BaseError;
  reset: () => void;
}

export const useTransfer = (): UseTransferReturn => {
  const publicClient = usePublicClient();
  const { address, isConnected } = useConnection();

  // ✅ Mutation-style hooks (correct for wagmi v3+)
  const sendTx = useSendTransaction();
  const writeTx = useWriteContract();

  const nativeHash = sendTx.data;
  const erc20Hash = writeTx.data;

  // Wait for receipt
  const {
    data: receipt,
    isLoading: isWaitingForReceipt,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash: nativeHash ?? erc20Hash,
  });

  // Transfer function
  const transfer = useCallback(
    async ({ toAddress, amount, tokenContract }: TransferParams) => {
      // Validation
      if (!address) throw new Error("Wallet not connected");
      if (!isConnected) throw new Error("Please reconnect your wallet");
      if (!toAddress) throw new Error("Invalid recipient address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Invalid amount");

      try {
        if (!tokenContract) {
          // ✅ Native token transfer
          await sendTx.mutateAsync({
            to: toAddress as `0x${string}`,
            value: parseEther(amount),
          });
        } else {
          // ✅ ERC20 transfer
          let decimals = 18;

          if (publicClient) {
            try {
              decimals = await publicClient.readContract({
                address: tokenContract as `0x${string}`,
                abi: erc20Abi,
                functionName: "decimals",
              });
            } catch (err) {
              console.warn("Failed to read decimals, defaulting to 18", err);
            }
          }

          const parsedAmount = parseUnits(amount, decimals);

          await writeTx.mutateAsync({
            address: tokenContract as `0x${string}`,
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, parsedAmount],
          });
        }
      } catch (err) {
        throw err as BaseError;
      }
    },
    [address, isConnected, publicClient, sendTx, writeTx]
  );

  // Reset function
  const reset = useCallback(() => {
    sendTx.reset();
    writeTx.reset();
  }, [sendTx, writeTx]);

  // ✅ Derived error (no mirrored state)
  const error = useMemo<BaseError | undefined>(() => {
    return (sendTx.error || writeTx.error) as BaseError | undefined;
  }, [sendTx.error, writeTx.error]);

  return {
    transfer,
    isTransferring: sendTx.isPending || writeTx.isPending,
    isWaitingForReceipt,
    isSuccess,
    transactionHash: nativeHash ?? erc20Hash,
    receipt,
    error,
    reset,
  };
};
