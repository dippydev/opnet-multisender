import {
  JSONRpcProvider,
  getContract,
  type BaseContractProperties,
  type BitcoinInterfaceAbi,
} from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import type { Address } from '@btc-vision/transaction';
import { RPC_URL } from '../config/constants';

/** Create a new JSONRpcProvider for OPNet testnet */
export function createProvider(): JSONRpcProvider {
  return new JSONRpcProvider({
    url: RPC_URL,
    network: networks.opnetTestnet,
  });
}

/** Resolve a string address to a PublicKeyInfo (for contract addresses, use isContract=true) */
export async function resolveAddress(
  provider: JSONRpcProvider,
  address: string,
  isContract: boolean,
): Promise<Address> {
  if (isContract) {
    return provider.getPublicKeyInfo(address, true);
  }
  // For wallet addresses: try ML-DSA first, fallback to tweaked pubkey only
  try {
    return await provider.getPublicKeyInfo(address, false);
  } catch {
    return provider.getPublicKeyInfo(address, true);
  }
}

/** Get a typed contract instance */
export function getTypedContract<T extends BaseContractProperties>(
  contractAddr: Address,
  abi: BitcoinInterfaceAbi,
  provider: JSONRpcProvider,
  senderAddr: Address,
) {
  return getContract<T>(
    contractAddr,
    abi,
    provider,
    networks.opnetTestnet,
    senderAddr,
  );
}

/** Convert human-readable amount string to bigint with token decimals */
export function parseAmountToBigInt(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  const num = Number(trimmed);
  if (isNaN(num) || num <= 0) return 0n;

  const parts = trimmed.split('.');
  const whole = parts[0] || '0';
  let frac = parts[1] || '';
  frac = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac);
}
