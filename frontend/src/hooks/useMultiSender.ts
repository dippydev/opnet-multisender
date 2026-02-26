import { useCallback, useState } from 'react';
import { networks } from '@btc-vision/bitcoin';
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

export interface BatchResult {
  batchIndex: number;
  txHash: string | null;
  status: 'pending' | 'sending' | 'confirmed' | 'failed';
  error?: string;
  recipientCount: number;
}

export interface MultiSendState {
  sending: boolean;
  batchResults: BatchResult[];
  currentBatch: number;
  totalBatches: number;
  error: string | null;
}

export interface SimulationResult {
  batchIndex: number;
  success: boolean;
  revertReason?: string;
  gasUsed: number;
  recipientCount: number;
}

/** Split recipients into batches of MAX_RECIPIENTS_PER_BATCH */
function splitIntoBatches(recipients: Recipient[]): Recipient[][] {
  const batches: Recipient[][] = [];
  for (let i = 0; i < recipients.length; i += MAX_RECIPIENTS_PER_BATCH) {
    batches.push(recipients.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
  }
  return batches;
}

/** Check if all amounts in a batch are equal */
function allAmountsEqual(batch: Recipient[]): boolean {
  if (batch.length === 0) return true;
  const first = batch[0]!.amount;
  return batch.every((r) => r.amount === first);
}

export function useMultiSender() {
  const { address } = useWallet();
  const { selectedToken, recipients, sendMode } = useRecipientStore();

  const [state, setState] = useState<MultiSendState>({
    sending: false,
    batchResults: [],
    currentBatch: 0,
    totalBatches: 0,
    error: null,
  });

  const [simulating, setSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<
    SimulationResult[] | null
  >(null);

  const sendOP20 = useCallback(async (): Promise<BatchResult[]> => {
    if (!address || !selectedToken || !MULTISENDER_CONTRACT_ADDRESS) {
      throw new Error('Missing wallet address, token, or contract address');
    }

    const batches = splitIntoBatches(recipients);
    const results: BatchResult[] = batches.map((batch, i) => ({
      batchIndex: i,
      txHash: null,
      status: 'pending' as const,
      recipientCount: batch.length,
    }));

    setState((s) => ({
      ...s,
      sending: true,
      batchResults: results,
      currentBatch: 0,
      totalBatches: batches.length,
      error: null,
    }));

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

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;

      // Update status to sending
      results[i] = { ...results[i]!, status: 'sending' };
      setState((s) => ({
        ...s,
        currentBatch: i,
        batchResults: [...results],
      }));

      try {
        // Resolve recipient addresses
        const recipientAddrs = await Promise.all(
          batch.map((r) => resolveAddress(provider, r.address, false)),
        );

        let simulation;

        if (allAmountsEqual(batch)) {
          // Use multiSendEqual when all amounts are the same
          const amountEach = parseAmountToBigInt(
            batch[0]!.amount,
            selectedToken.decimals,
          );
          simulation = await contract.multiSendEqual(
            tokenAddr,
            recipientAddrs,
            amountEach,
          );
        } else {
          // Use multiSend with individual amounts
          const amounts = batch.map((r) =>
            parseAmountToBigInt(r.amount, selectedToken.decimals),
          );
          simulation = await contract.multiSend(
            tokenAddr,
            recipientAddrs,
            amounts,
          );
        }

        // Check for revert
        if (simulation.revert) {
          throw new Error(simulation.revert);
        }

        // Send transaction (OPWallet handles signing on frontend)
        const txResult = await simulation.sendTransaction({
          signer: null,
          mldsaSigner: null,
          refundTo: address,
          maximumAllowedSatToSpend: 100_000n,
          network: networks.opnetTestnet,
        });

        results[i] = {
          ...results[i]!,
          status: 'confirmed',
          txHash:
            typeof txResult === 'object' && txResult !== null && 'txHash' in txResult
              ? String(txResult.txHash)
              : null,
        };
      } catch (err) {
        results[i] = {
          ...results[i]!,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }

      setState((s) => ({
        ...s,
        batchResults: [...results],
      }));
    }

    setState((s) => ({
      ...s,
      sending: false,
      currentBatch: batches.length,
    }));

    return results;
  }, [address, selectedToken, recipients]);

  const reset = useCallback(() => {
    setState({
      sending: false,
      batchResults: [],
      currentBatch: 0,
      totalBatches: 0,
      error: null,
    });
  }, []);

  /** Simulate all batches without broadcasting — dry run */
  const simulateSend = useCallback(async (): Promise<SimulationResult[]> => {
    if (!address || !selectedToken || recipients.length === 0) {
      return [];
    }

    setSimulating(true);
    setSimulationResults(null);

    try {
      if (sendMode === 'btc') {
        // BTC mode: no contract simulation, estimate fees
        const BTC_TX_VBYTES = 154;
        const DEFAULT_FEE_RATE = 1;
        const costPerTx = BTC_TX_VBYTES * DEFAULT_FEE_RATE;
        const results: SimulationResult[] = [
          {
            batchIndex: 0,
            success: true,
            gasUsed: costPerTx * recipients.length,
            recipientCount: recipients.length,
          },
        ];
        setSimulationResults(results);
        return results;
      }

      // OP20 mode: simulate all batches
      if (!MULTISENDER_CONTRACT_ADDRESS) {
        throw new Error('No contract address configured');
      }

      const batches = splitIntoBatches(recipients);
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

      const results: SimulationResult[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]!;
        try {
          const recipientAddrs = await Promise.all(
            batch.map((r) => resolveAddress(provider, r.address, false)),
          );

          let simulation;
          if (allAmountsEqual(batch)) {
            const amountEach = parseAmountToBigInt(
              batch[0]!.amount,
              selectedToken.decimals,
            );
            simulation = await contract.multiSendEqual(
              tokenAddr,
              recipientAddrs,
              amountEach,
            );
          } else {
            const amounts = batch.map((r) =>
              parseAmountToBigInt(r.amount, selectedToken.decimals),
            );
            simulation = await contract.multiSend(
              tokenAddr,
              recipientAddrs,
              amounts,
            );
          }

          // Extract gas from simulation result
          const simObj = simulation as unknown as Record<string, unknown>;
          let gasUsed = 0;
          if (typeof simObj.gasUsed === 'bigint') {
            gasUsed = Number(simObj.gasUsed);
          } else if (typeof simObj.gasUsed === 'number') {
            gasUsed = simObj.gasUsed;
          } else if (typeof simObj.estimatedCost === 'bigint') {
            gasUsed = Number(simObj.estimatedCost);
          } else if (typeof simObj.estimatedCost === 'number') {
            gasUsed = simObj.estimatedCost;
          }

          results.push({
            batchIndex: i,
            success: !simulation.revert,
            revertReason: simulation.revert
              ? String(simulation.revert)
              : undefined,
            gasUsed,
            recipientCount: batch.length,
          });
        } catch (err) {
          results.push({
            batchIndex: i,
            success: false,
            revertReason:
              err instanceof Error ? err.message : 'Simulation failed',
            gasUsed: 0,
            recipientCount: batch.length,
          });
        }
      }

      setSimulationResults(results);
      return results;
    } catch (err) {
      const errorResult: SimulationResult[] = [
        {
          batchIndex: 0,
          success: false,
          revertReason:
            err instanceof Error ? err.message : 'Simulation failed',
          gasUsed: 0,
          recipientCount: recipients.length,
        },
      ];
      setSimulationResults(errorResult);
      return errorResult;
    } finally {
      setSimulating(false);
    }
  }, [address, selectedToken, recipients, sendMode]);

  const clearSimulation = useCallback(() => {
    setSimulationResults(null);
  }, []);

  return {
    ...state,
    sendOP20,
    reset,
    simulating,
    simulationResults,
    simulateSend,
    clearSimulation,
  };
}
