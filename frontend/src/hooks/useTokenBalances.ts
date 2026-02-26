import { useCallback, useEffect, useState } from 'react';
import {
  JSONRpcProvider,
  getContract,
  OP_20_ABI,
  type IOP20Contract,
} from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { RPC_URL, type KnownToken } from '../config/constants';

export interface TokenBalanceEntry {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}

interface UseTokenBalancesReturn {
  btcBalance: bigint;
  tokenBalances: TokenBalanceEntry[];
  loading: boolean;
  refresh: () => void;
}

export function useTokenBalances(
  walletAddress: string | null,
  tokenList: KnownToken[],
): UseTokenBalancesReturn {
  const [btcBalance, setBtcBalance] = useState<bigint>(0n);
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!walletAddress || tokenList.length === 0) {
      setBtcBalance(0n);
      setTokenBalances([]);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });

      // Fetch BTC balance
      const btcPromise = provider
        .getBalance(walletAddress!, false)
        .catch(() => 0n);

      // Resolve wallet address for contract calls
      let senderAddr;
      try {
        senderAddr = await provider.getPublicKeyInfo(walletAddress!, false);
      } catch {
        try {
          senderAddr = await provider.getPublicKeyInfo(walletAddress!, true);
        } catch {
          // Can't resolve wallet — just show 0 balances for OP20s
          const btc = await btcPromise;
          if (!cancelled) {
            setBtcBalance(btc);
            setTokenBalances(
              tokenList.map((kt) => ({
                address: kt.address,
                symbol: kt.symbol,
                name: kt.name,
                decimals: kt.decimals,
                balance: 0n,
              })),
            );
            setLoading(false);
          }
          return;
        }
      }

      // Fetch each token balance in parallel
      const tokenPromises = tokenList.map(async (kt) => {
        try {
          const contractAddr = await provider.getPublicKeyInfo(
            kt.address,
            true,
          );
          const contract = getContract<IOP20Contract>(
            contractAddr,
            OP_20_ABI,
            provider,
            networks.opnetTestnet,
            senderAddr!,
          );
          const res = await contract.balanceOf(senderAddr!);
          return {
            address: kt.address,
            symbol: kt.symbol,
            name: kt.name,
            decimals: kt.decimals,
            balance: res.properties.balance as bigint,
          };
        } catch {
          return {
            address: kt.address,
            symbol: kt.symbol,
            name: kt.name,
            decimals: kt.decimals,
            balance: 0n,
          };
        }
      });

      const [btc, ...tokens] = await Promise.all([
        btcPromise,
        ...tokenPromises,
      ]);

      if (!cancelled) {
        setBtcBalance(btc);
        setTokenBalances(tokens);
        setLoading(false);
      }
    }

    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, tokenList, refreshKey]);

  return { btcBalance, tokenBalances, loading, refresh };
}
