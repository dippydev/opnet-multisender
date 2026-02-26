import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networks, type Network } from '@btc-vision/bitcoin';

// Load .env from scripts/ root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

/** OPNet RPC endpoints */
export const RPC_URLS = {
    testnet: 'https://testnet.opnet.org',
    mainnet: 'https://mainnet.opnet.org',
} as const;

/** Current network — switch to networks.bitcoin for mainnet */
export const NETWORK: Network = networks.opnetTestnet;

/** Network key for addresses.json lookup */
export const NETWORK_KEY: 'testnet' | 'mainnet' = 'testnet';

/** RPC URL matching the current network */
export const RPC_URL: string = RPC_URLS.testnet;

/** Load WIF private key from environment */
export function getWifKey(): string {
    const wif = process.env.WIF_PRIVATE_KEY;
    if (!wif) {
        throw new Error(
            'WIF_PRIVATE_KEY not set in .env file.',
        );
    }
    return wif;
}

/** Load mnemonic from environment (used for ML-DSA quantum signer) */
export function getMnemonic(): string | null {
    return process.env.OPNET_MNEMONIC ?? null;
}

/** Load addresses.json for the multisender */
export function loadAddresses(): Record<string, string> {
    const filePath = resolve(__dirname, 'addresses.json');
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, Record<string, string>>;
    const addrs = data[NETWORK_KEY];
    if (!addrs) {
        throw new Error(`No addresses found for network "${NETWORK_KEY}" in ${filePath}`);
    }
    return addrs;
}

/** Save an address to addresses.json */
export function saveAddress(key: string, value: string): void {
    const filePath = resolve(__dirname, 'addresses.json');
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, Record<string, string>>;
    if (!data[NETWORK_KEY]) {
        data[NETWORK_KEY] = {};
    }
    data[NETWORK_KEY][key] = value;
    writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
}
