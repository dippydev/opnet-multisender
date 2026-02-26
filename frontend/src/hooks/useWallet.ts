import { useWalletConnect } from '@btc-vision/walletconnect';
import { useCallback, useEffect, useState } from 'react';
import { RPC_URL } from '../config/constants';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  connecting: boolean;
  balance: bigint | null;
  balanceLoading: boolean;
  network: 'testnet' | 'mainnet';
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

export function useWallet(): WalletState {
  const { walletAddress, openConnectModal, disconnect, connecting } =
    useWalletConnect();

  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const network: 'testnet' | 'mainnet' = RPC_URL.includes('testnet')
    ? 'testnet'
    : 'mainnet';

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }

    setBalanceLoading(true);
    try {
      const { JSONRpcProvider } = await import('opnet');
      const { networks } = await import('@btc-vision/bitcoin');
      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });
      const bal = await provider.getBalance(walletAddress, false);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  return {
    address: walletAddress ?? null,
    isConnected: !!walletAddress,
    connecting,
    balance,
    balanceLoading,
    network,
    connect: openConnectModal,
    disconnect,
    refreshBalance: fetchBalance,
  };
}
