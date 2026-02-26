import { WalletConnectProvider } from '@btc-vision/walletconnect';
import type { ReactNode } from 'react';

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WalletConnectProvider theme="dark">
      {children}
    </WalletConnectProvider>
  );
}
