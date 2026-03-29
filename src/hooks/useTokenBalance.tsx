/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { formatUnits } from "viem";
import { getBalance, readContract } from "wagmi/actions";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export function useTokenBalance({
  address,
  chainId,
  config,
  contractAddress,
}: {
  address: string;
  chainId: number;
  config: any;
  contractAddress?: string;
}) {
  const [balance, setBalance] = useState<string>("0");
  const [decimals, setDecimals] = useState<number>(18);
  const [symbol, setSymbol] = useState<string>("");
  const [isPending, setIsPending] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address) return;

    setIsPending(true);
    try {
      if (contractAddress) {
        // ERC-20: use readContract directly to avoid getBalance's silent ETH fallback
        const token = contractAddress as `0x${string}`;
        const account = address as `0x${string}`;

        const [rawBalance, tokenDecimals, tokenSymbol] = await Promise.all([
          readContract(config, {
            address: token,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account],
            chainId,
          }),
          readContract(config, {
            address: token,
            abi: ERC20_ABI,
            functionName: "decimals",
            chainId,
          }),
          readContract(config, {
            address: token,
            abi: ERC20_ABI,
            functionName: "symbol",
            chainId,
          }),
        ]);

        setBalance(formatUnits(rawBalance as bigint, tokenDecimals as number));
        setDecimals(tokenDecimals as number);
        setSymbol(tokenSymbol as string);
      } else {
        // Native ETH
        const bal = await getBalance(config, {
          address: address as `0x${string}`,
          chainId,
        });

        setBalance(formatUnits(bal.value, bal.decimals));
        setDecimals(bal.decimals);
        setSymbol(bal.symbol);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setBalance("0");
      setSymbol("");
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, config, contractAddress]);

  return { balance, decimals, symbol, isPending, fetchBalance };
}