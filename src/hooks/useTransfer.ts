import { useAppKitNetwork } from "@reown/appkit/react";
import { useSPLTransfer } from "./useSPLTransfer";
import { useEVMTransfer } from "./useEVMTransfer";
import type { TokenConfig } from "@/constants/tokens";

export type ChainType = 'solana' | 'evm';

export interface NormalizedTransfer {
    address: string | undefined;
    isConnected: boolean;
    nativeBalance: number | null;
    nativeSymbol: string;
    tokenBalances: { symbol: string; contractAddress: string; balance: number; logoUrl?: string }[];
    supportedTokens: TokenConfig[];
    loading: boolean;
    error: string | null;
    chain: ChainType;
    fetchBalances: () => Promise<void>;
    sendNative: (to: string, amount: number) => Promise<{ signature: string; explorerUrl: string }>;
    sendToken: (token: TokenConfig, to: string, amount: number) => Promise<{ signature: string; explorerUrl: string }>;
}

export interface UseTransferParams {
    solanaTokens?: TokenConfig[];
    evmTokens?: TokenConfig[];
}

export function useTransfer({ solanaTokens = [], evmTokens = [] }: UseTransferParams = {}): NormalizedTransfer {
    const { caipNetwork } = useAppKitNetwork();

    // Hooks are unconditionally called with the dynamic token arrays
    const solana = useSPLTransfer(solanaTokens);
    const evm = useEVMTransfer(evmTokens);

    const isSolana = caipNetwork?.caipNetworkId?.startsWith("solana:");

    if (isSolana) {
        return {
            address: solana.address,
            isConnected: solana.isConnected,
            nativeBalance: solana.solBalance,
            nativeSymbol: "SOL",
            tokenBalances: solana.tokenBalances.map((t) => ({
                symbol: t.symbol,
                contractAddress: t.mint,
                balance: t.balance,
                logoUrl: t.logoUrl,
            })),
            supportedTokens: solanaTokens,
            loading: solana.loading,
            error: solana.error,
            chain: "solana",
            fetchBalances: solana.fetchBalances,
            sendNative: solana.sendSOL,
            sendToken: solana.sendToken,
        };
    }

    return {
        address: evm.address,
        isConnected: evm.isConnected,
        nativeBalance: evm.nativeBalance,
        nativeSymbol: "ETH",
        tokenBalances: evm.tokenBalances,
        supportedTokens: evmTokens,
        loading: evm.loading,
        error: evm.error,
        chain: "evm",
        fetchBalances: evm.fetchBalances,
        sendNative: evm.sendNative,
        sendToken: evm.sendToken,
    };
}