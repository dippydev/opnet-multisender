import { create } from 'zustand';

interface WalletStoreState {
  address: string | null;
  isConnected: boolean;
  balance: bigint | null;
  network: 'testnet' | 'mainnet';
  setWallet: (wallet: {
    address: string | null;
    isConnected: boolean;
    balance: bigint | null;
    network: 'testnet' | 'mainnet';
  }) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletStoreState>((set) => ({
  address: null,
  isConnected: false,
  balance: null,
  network: 'testnet',
  setWallet: (wallet) => set(wallet),
  clearWallet: () =>
    set({
      address: null,
      isConnected: false,
      balance: null,
      network: 'testnet',
    }),
}));
