import { useCallback, useEffect, useState } from 'react';
import {
  JSONRpcProvider,
  getContract,
  OP_20_ABI,
  type IOP20Contract,
} from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { RPC_URL, KNOWN_TOKENS, type KnownToken } from '../config/constants';

export interface TokenInfo {
  address: string | null; // null = BTC
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  isBTC: boolean;
}

interface UseTokenReturn {
  token: TokenInfo | null;
  loading: boolean;
  error: string | null;
  selectBTC: () => void;
  selectKnownToken: (token: KnownToken) => void;
  selectCustomToken: (address: string) => void;
}

const BTC_TOKEN: Omit<TokenInfo, 'balance'> = {
  address: null,
  name: 'Bitcoin',
  symbol: 'BTC',
  decimals: 8,
  isBTC: true,
};

export function useToken(walletAddress: string | null): UseTokenReturn {
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isBTCSelected, setIsBTCSelected] = useState(false);

  const fetchBTCBalance = useCallback(async (): Promise<bigint> => {
    if (!walletAddress) return 0n;
    try {
      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });
      const bal = await provider.getBalance(walletAddress, false);
      return bal;
    } catch {
      return 0n;
    }
  }, [walletAddress]);

  const fetchOP20Metadata = useCallback(
    async (
      address: string,
    ): Promise<{
      name: string;
      symbol: string;
      decimals: number;
      balance: bigint;
    }> => {
      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });

      const contractAddr = await provider.getPublicKeyInfo(address, true);

      let senderAddr;
      if (walletAddress) {
        try {
          senderAddr = await provider.getPublicKeyInfo(walletAddress, false);
        } catch {
          senderAddr = await provider.getPublicKeyInfo(walletAddress, true);
        }
      } else {
        senderAddr = contractAddr;
      }

      const token = getContract<IOP20Contract>(
        contractAddr,
        OP_20_ABI,
        provider,
        networks.opnetTestnet,
        senderAddr,
      );

      const [nameRes, symbolRes, decimalsRes] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
      ]);

      let balance = 0n;
      if (walletAddress) {
        const balanceRes = await token.balanceOf(senderAddr);
        balance = balanceRes.properties.balance;
      }

      return {
        name: nameRes.properties.name as string,
        symbol: symbolRes.properties.symbol as string,
        decimals: Number(decimalsRes.properties.decimals),
        balance,
      };
    },
    [walletAddress],
  );

  // Fetch token data whenever selection or wallet changes
  useEffect(() => {
    if (isBTCSelected) {
      setLoading(true);
      setError(null);
      fetchBTCBalance()
        .then((balance) => {
          setToken({ ...BTC_TOKEN, balance });
        })
        .catch(() => {
          setToken({ ...BTC_TOKEN, balance: 0n });
        })
        .finally(() => setLoading(false));
      return;
    }

    if (!selectedAddress) {
      setToken(null);
      setError(null);
      return;
    }

    // Check if it's a known token first
    const known = KNOWN_TOKENS.find(
      (t) => t.address.toLowerCase() === selectedAddress.toLowerCase(),
    );

    setLoading(true);
    setError(null);

    fetchOP20Metadata(selectedAddress)
      .then((meta) => {
        setToken({
          address: selectedAddress,
          name: known?.name ?? meta.name,
          symbol: known?.symbol ?? meta.symbol,
          decimals: known?.decimals ?? meta.decimals,
          balance: meta.balance,
          isBTC: false,
        });
      })
      .catch((err) => {
        console.error('Failed to fetch token metadata:', err);
        setError('invalid_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [
    selectedAddress,
    isBTCSelected,
    walletAddress,
    fetchBTCBalance,
    fetchOP20Metadata,
  ]);

  const selectBTC = useCallback(() => {
    setIsBTCSelected(true);
    setSelectedAddress(null);
    setError(null);
  }, []);

  const selectKnownToken = useCallback((t: KnownToken) => {
    setIsBTCSelected(false);
    setSelectedAddress(t.address);
    setError(null);
  }, []);

  const selectCustomToken = useCallback((address: string) => {
    setIsBTCSelected(false);
    setSelectedAddress(address);
    setError(null);
  }, []);

  return {
    token,
    loading,
    error,
    selectBTC,
    selectKnownToken,
    selectCustomToken,
  };
}
