import { useState, useCallback } from 'react';
import { useRecipientStore, type Recipient } from '../store/recipientStore';
import { useWallet } from './useWallet';
import {
  MULTISENDER_CONTRACT_ADDRESS,
  MAX_RECIPIENTS_PER_BATCH,
} from '../config/constants';
import {
  createProvider,
  resolveAddress,
  getTypedContract,
  parseAmountToBigInt,
} from '../lib/opnet';
import {
  MultiSenderAbi,
  type IMultiSender,
} from '../config/multisender-abi';

export interface GasEstimate {
  totalSats: number;
  perBatchSats: number;
  batchCount: number;
  estimating: boolean;
  error: string | null;
}

/** Average P2TR transaction size: 1 input + 2 outputs (payment + change) */
const BTC_TX_VBYTES = 154;
/** Default fee rate in sat/vB (conservative for testnet) */
const DEFAULT_FEE_RATE = 1;

function allAmountsEqual(batch: Recipient[]): boolean {
  if (batch.length === 0) return true;
  const first = batch[0]!.amount;
  return batch.every((r) => r.amount === first);
}

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
      if (sendMode === 'btc') {
        // BTC mode: feeRate * estimated vbytes * recipient count
        const costPerTx = BTC_TX_VBYTES * DEFAULT_FEE_RATE;
        const totalSats = costPerTx * recipients.length;
        setEstimate({
          totalSats,
          perBatchSats: costPerTx,
          batchCount: recipients.length,
          estimating: false,
          error: null,
        });
      } else {
        // OP20 mode: simulate first batch to estimate gas per batch
        if (!MULTISENDER_CONTRACT_ADDRESS) {
          setEstimate({
            totalSats: 0,
            perBatchSats: 0,
            batchCount: 0,
            estimating: false,
            error: 'No contract address configured',
          });
          return;
        }

        const batchCount = Math.ceil(
          recipients.length / MAX_RECIPIENTS_PER_BATCH,
        );
        const firstBatch = recipients.slice(0, MAX_RECIPIENTS_PER_BATCH);

        const provider = createProvider();
        const contractAddr = await resolveAddress(
          provider,
          MULTISENDER_CONTRACT_ADDRESS,
          true,
        );
        const senderAddr = await resolveAddress(provider, address, false);
        const tokenAddr = await resolveAddress(
          provider,
          selectedToken.address!,
          true,
        );

        const contract = getTypedContract<IMultiSender>(
          contractAddr,
          MultiSenderAbi,
          provider,
          senderAddr,
        );

        // Resolve recipient addresses for simulation
        const recipientAddrs = await Promise.all(
          firstBatch.map((r) => resolveAddress(provider, r.address, false)),
        );

        let simulation;
        if (allAmountsEqual(firstBatch)) {
          const amountEach = parseAmountToBigInt(
            firstBatch[0]!.amount,
            selectedToken.decimals,
          );
          simulation = await contract.multiSendEqual(
            tokenAddr,
            recipientAddrs,
            amountEach,
          );
        } else {
          const amounts = firstBatch.map((r) =>
            parseAmountToBigInt(r.amount, selectedToken.decimals),
          );
          simulation = await contract.multiSend(
            tokenAddr,
            recipientAddrs,
            amounts,
          );
        }

        if (simulation.revert) {
          setEstimate({
            totalSats: 0,
            perBatchSats: 0,
            batchCount,
            estimating: false,
            error: simulation.revert,
          });
          return;
        }

        // Extract gas estimate from simulation result
        const result = simulation as unknown as Record<string, unknown>;
        let perBatchSats = 0;
        if (typeof result.gasUsed === 'bigint') {
          perBatchSats = Number(result.gasUsed);
        } else if (typeof result.gasUsed === 'number') {
          perBatchSats = result.gasUsed;
        } else if (typeof result.estimatedCost === 'bigint') {
          perBatchSats = Number(result.estimatedCost);
        } else if (typeof result.estimatedCost === 'number') {
          perBatchSats = result.estimatedCost;
        }

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
