import { useCallback, useEffect, useState } from 'react';
import { MULTISENDER_CONTRACT_ADDRESS } from '../config/constants';
import {
  createProvider,
  resolveAddress,
  getTypedContract,
} from '../lib/opnet';
import {
  MultiSenderAbi,
  type IMultiSender,
} from '../config/multisender-abi';
import { useWallet } from './useWallet';

/**
 * Returns whether the connected wallet is the MultiSender contract owner.
 * Re-checks whenever the wallet address changes.
 */
export function useIsOwner() {
  const { address, isConnected } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    if (!isConnected || !address || !MULTISENDER_CONTRACT_ADDRESS) {
      setIsOwner(false);
      return;
    }

    setChecking(true);
    try {
      const provider = createProvider();
      const contractAddr = await resolveAddress(
        provider,
        MULTISENDER_CONTRACT_ADDRESS,
        true,
      );
      const senderAddr = await resolveAddress(provider, address, false).catch(
        () => contractAddr,
      );

      const contract = getTypedContract<IMultiSender>(
        contractAddr,
        MultiSenderAbi,
        provider,
        senderAddr,
      );

      const ownerRes = await contract.getOwner();
      const ownerRaw = ownerRes.properties.owner;
      const ownerHex =
        typeof (ownerRaw as { toHex?: () => string }).toHex === 'function'
          ? (ownerRaw as { toHex: () => string }).toHex()
          : String(ownerRaw);

      // Resolve wallet to same hex format for comparison
      let walletHex: string;
      try {
        const walletResolved = await resolveAddress(provider, address, false);
        walletHex =
          typeof walletResolved.toHex === 'function'
            ? walletResolved.toHex()
            : String(walletResolved);
      } catch {
        walletHex = '';
      }

      setIsOwner(
        walletHex !== '' &&
          walletHex.toLowerCase() === ownerHex.toLowerCase(),
      );
    } catch {
      setIsOwner(false);
    } finally {
      setChecking(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    void check();
  }, [check]);

  return { isOwner, checking };
}
