import { useState, useCallback } from 'react';
import { useRecipientStore } from '../store/recipientStore';
import { useWallet } from './useWallet';
import { MAX_RECIPIENTS_PER_BATCH } from '../config/constants';
import { createProvider } from '../lib/opnet';

export interface GasEstimate {
  totalSats: number;
  perBatchSats: number;
  batchCount: number;
  estimating: boolean;
  error: string | null;
}

/**
 * Estimated vbytes for a P2TR transaction.
 * 1 input + 2 outputs (payment + change) ≈ 154 vB.
 * OP20 contract calls are larger due to calldata; use ~350 vB as a
 * conservative estimate for a multiSend batch.
 */
const BTC_TX_VBYTES = 154;
const OP20_TX_VBYTES = 350;

export function useGasEstimate() {
  const { address } = useWallet();
  const { selectedToken, recipients, sendMode } = useRecipientStore();

  const [estimate, setEstimate] = useState<GasEstimate>({
    totalSats: 0,
    perBatchSats: 0,
    batchCount: 0,
    estimating: false,
    error: null,
  });

  const estimateGas = useCallback(async () => {
    if (!address || !selectedToken || recipients.length === 0) {
      setEstimate({
        totalSats: 0,
        perBatchSats: 0,
        batchCount: 0,
        estimating: false,
        error: null,
      });
      return;
    }

    setEstimate((s) => ({ ...s, estimating: true, error: null }));

    try {
      // Fetch current fee rate from RPC gas parameters
      const provider = createProvider();
      let feeRate = 2; // default medium sat/vB
      try {
        const gas = await provider.gasParameters();
        feeRate = Math.ceil(gas.bitcoin.recommended.medium);
      } catch {
        // Use default fee rate
      }

      if (sendMode === 'btc') {
        // BTC mode: one P2TR transaction per recipient
        const costPerTx = BTC_TX_VBYTES * feeRate;
        const totalSats = costPerTx * recipients.length;
        setEstimate({
          totalSats,
          perBatchSats: costPerTx,
          batchCount: recipients.length,
          estimating: false,
          error: null,
        });
      } else {
        // OP20 mode: one contract call per batch of up to 100 recipients.
        // We can't simulate before allowance is set, so use a static
        // estimate based on fee rate and estimated tx size.
        const batchCount = Math.ceil(
          recipients.length / MAX_RECIPIENTS_PER_BATCH,
        );
        const perBatchSats = OP20_TX_VBYTES * feeRate;
        const totalSats = perBatchSats * batchCount;

        setEstimate({
          totalSats,
          perBatchSats,
          batchCount,
          estimating: false,
          error: null,
        });
      }
    } catch (err) {
      setEstimate((s) => ({
        ...s,
        estimating: false,
        error: err instanceof Error ? err.message : 'Estimation failed',
      }));
    }
  }, [address, selectedToken, recipients, sendMode]);

  return {
    ...estimate,
    estimateGas,
  };
}
