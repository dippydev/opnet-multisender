import { useCallback, useEffect, useState } from 'react';
import { type IOP20Contract, OP_20_ABI } from 'opnet';
import type { Address } from '@btc-vision/transaction';
import { createProvider, resolveAddress, getTypedContract } from '../lib/opnet';
import {
  PILL_TOKEN_ADDRESS,
  PILL_REQUIRED_AMOUNT,
  PILL_DECIMALS,
} from '../config/constants';

/** Check if a resolved value is a real Address (not an RPC error object) */
function isValidAddress(addr: unknown): addr is Address {
  return (
    addr != null &&
    typeof addr === 'object' &&
    !('error' in (addr as Record<string, unknown>)) &&
    typeof (addr as Address).toHex === 'function'
  );
}

const BYPASS_KEY = 'bitsend_pill_bypass';

interface PillGateState {
  /** Raw PILL balance (bigint) */
  balance: bigint;
  /** Human-readable PILL balance */
  balanceFormatted: string;
  /** Required amount (human-readable) */
  required: number;
  /** Whether balance meets the requirement */
  sufficient: boolean;
  /** How many more PILL tokens are needed (human-readable) */
  deficit: number;
  /** Loading state */
  loading: boolean;
  /** Error message if balance check failed */
  error: string | null;
  /** Whether the gate is bypassed (testing) */
  bypassed: boolean;
  /** Toggle bypass mode */
  toggleBypass: () => void;
  /** Re-check balance */
  refresh: () => Promise<void>;
}

export function usePillGate(walletAddress: string | null): PillGateState {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bypassed, setBypassed] = useState(() => {
    try {
      return localStorage.getItem(BYPASS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleBypass = useCallback(() => {
    setBypassed((prev) => {
      const next = !prev;
      try {
        if (next) {
          localStorage.setItem(BYPASS_KEY, 'true');
        } else {
          localStorage.removeItem(BYPASS_KEY);
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(0n);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = createProvider();

      // Resolve wallet address — getPublicKeyInfo may return an RPC error
      // object (not throw) when the wallet has no on-chain history.
      // In that case the wallet definitely holds 0 PILL.
      let senderAddr: unknown;
      try {
        senderAddr = await resolveAddress(provider, walletAddress, false);
      } catch {
        // Wallet not indexed on-chain → 0 balance, no error
        setBalance(0n);
        setLoading(false);
        return;
      }

      if (!isValidAddress(senderAddr)) {
        // RPC returned error object instead of Address → wallet not indexed
        setBalance(0n);
        setLoading(false);
        return;
      }

      const contractAddr = await resolveAddress(
        provider,
        PILL_TOKEN_ADDRESS,
        true,
      );

      if (!isValidAddress(contractAddr)) {
        setError('PILL token contract not found on network');
        setBalance(0n);
        setLoading(false);
        return;
      }

      const contract = getTypedContract<IOP20Contract>(
        contractAddr,
        OP_20_ABI,
        provider,
        senderAddr,
      );
      const res = await contract.balanceOf(senderAddr);
      const bal = res.properties.balance as bigint;
      setBalance(bal);
    } catch (err) {
      console.error('Failed to check PILL balance:', err);
      // If the PILL contract itself doesn't exist or can't be queried,
      // show error so the user knows something is wrong
      setError('Failed to check PILL token balance');
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  const divisor = 10n ** BigInt(PILL_DECIMALS);
  const balanceHuman = Number(balance) / Number(divisor);
  const balanceFormatted = balanceHuman.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  const sufficient = balanceHuman >= PILL_REQUIRED_AMOUNT;
  const deficit = sufficient ? 0 : PILL_REQUIRED_AMOUNT - balanceHuman;

  return {
    balance,
    balanceFormatted,
    required: PILL_REQUIRED_AMOUNT,
    sufficient,
    deficit,
    loading,
    error,
    bypassed,
    toggleBypass,
    refresh: fetchBalance,
  };
}
