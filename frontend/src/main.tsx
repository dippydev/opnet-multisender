import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from './components/wallet/WalletProvider';
import App from './App';
import './styles/globals.css';
import './i18n';

// Silence noisy wallet-connect library logs in production
if (import.meta.env.PROD) {
  const _log = console.log.bind(console);
  const MUTED = /CanAutoConnect|Attempting to reconnect|hook for OPWallet|Connected to wallet/;
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && MUTED.test(args[0])) return;
    _log(...args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
);
