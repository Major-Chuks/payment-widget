/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { formatUnits } from "viem";
import { getBalance } from "wagmi/actions";

export function useTokenBalance({
  address,
  chainId,
  config,
  contractAddress, // optional — if omitted, fetches Ether
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
      const bal = await getBalance(config, {
        address: address as `0x${string}`,
        chainId,
        ...(contractAddress && { token: contractAddress as `0x${string}` }),
      });

      setBalance(formatUnits(bal.value, bal.decimals));
      setDecimals(bal.decimals);
      setSymbol(bal.symbol);
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
