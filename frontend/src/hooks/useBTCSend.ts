import { useCallback, useState } from 'react';
import { networks } from '@btc-vision/bitcoin';
import { TransactionFactory, UnisatSigner } from '@btc-vision/transaction';
import { useRecipientStore } from '../store/recipientStore';
import { useWallet } from './useWallet';
import { createProvider, parseAmountToBigInt } from '../lib/opnet';
import type { BatchResult, MultiSendState } from './useMultiSender';

const BTC_DECIMALS = 8;

/**
 * Hook for sending native BTC to multiple recipients.
 * Each recipient gets an individual transaction (no contract involved).
 * Uses TransactionFactory.createBTCTransfer with UTXO chaining for sequential sends.
 */
export function useBTCSend() {
  const { address } = useWallet();
  const { recipients } = useRecipientStore();

  const [state, setState] = useState<MultiSendState>({
    sending: false,
    batchResults: [],
    currentBatch: 0,
    totalBatches: 0,
    error: null,
  });

  const sendBTC = useCallback(async (): Promise<BatchResult[]> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (recipients.length === 0) {
      throw new Error('No recipients');
    }

    // Each recipient is its own "batch" (1 tx per recipient)
    const results: BatchResult[] = recipients.map((_, i) => ({
      batchIndex: i,
      txHash: null,
      status: 'pending' as const,
      recipientCount: 1,
    }));

    setState({
      sending: true,
      batchResults: results,
      currentBatch: 0,
      totalBatches: recipients.length,
      error: null,
    });

    const provider = createProvider();
    const factory = new TransactionFactory();

    // Initialize wallet signer (connects to OPWallet/UniSat extension)
    const signer = new UnisatSigner();
    await signer.init();

    // Fetch initial UTXOs — request enough to cover all sends
    const totalSats = recipients.reduce(
      (sum, r) => sum + parseAmountToBigInt(r.amount, BTC_DECIMALS),
      0n,
    );
    let utxos = await provider.utxoManager.getUTXOsForAmount({
      address,
      amount: totalSats,
      optimize: false,
      throwErrors: true,
    });

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]!;

      // Update status to sending
      results[i] = { ...results[i]!, status: 'sending' };
      setState((s) => ({
        ...s,
        currentBatch: i,
        batchResults: [...results],
      }));

      try {
        // Convert human-readable amount to satoshis (BTC has 8 decimals)
        const amountSats = parseAmountToBigInt(recipient.amount, BTC_DECIMALS);

        const btcTransfer = await factory.createBTCTransfer({
          from: address,
          to: recipient.address,
          amount: amountSats,
          utxos,
          signer,
          mldsaSigner: null,
          network: networks.opnetTestnet,
          feeRate: 10,
          priorityFee: 0n,
          gasSatFee: 0n,
        });

        // Broadcast the signed transaction
        const broadcastResult = await provider.sendRawTransaction(
          btcTransfer.tx,
          false,
        );

        // Chain UTXOs: use change outputs from this tx for the next one
        utxos = btcTransfer.nextUTXOs;

        // Also notify the UTXO manager about spent/new UTXOs
        provider.utxoManager.spentUTXO(
          address,
          btcTransfer.inputUtxos,
          btcTransfer.nextUTXOs,
        );

        results[i] = {
          ...results[i]!,
          status: 'confirmed',
          txHash: broadcastResult.result ?? null,
        };
      } catch (err) {
        results[i] = {
          ...results[i]!,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        };

        // On failure, re-fetch UTXOs for remaining sends
        try {
          const remainingSats = recipients
            .slice(i + 1)
            .reduce(
              (sum, r) => sum + parseAmountToBigInt(r.amount, BTC_DECIMALS),
              0n,
            );
          if (remainingSats > 0n) {
            utxos = await provider.utxoManager.getUTXOsForAmount({
              address,
              amount: remainingSats,
              optimize: false,
              throwErrors: false,
            });
          }
        } catch {
          // If re-fetch fails, subsequent sends will likely fail too — but we continue
        }
      }

      setState((s) => ({
        ...s,
        batchResults: [...results],
      }));
    }

    setState((s) => ({
      ...s,
      sending: false,
      currentBatch: recipients.length,
    }));

    return results;
  }, [address, recipients]);

  const reset = useCallback(() => {
    setState({
      sending: false,
      batchResults: [],
      currentBatch: 0,
      totalBatches: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendBTC,
    reset,
  };
}
