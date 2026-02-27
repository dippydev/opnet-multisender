#!/usr/bin/env node

/**
 * opnet-wallet — Generate fresh OPNet Bitcoin wallets from any terminal.
 *
 * Usage:
 *   opnet-wallet                  # 1 testnet wallet
 *   opnet-wallet 5                # 5 testnet wallets
 *   opnet-wallet --mainnet        # 1 mainnet wallet
 *   opnet-wallet 3 --mainnet      # 3 mainnet wallets
 */

import { EcKeyPair } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

const args = process.argv.slice(2);
const isMainnet = args.includes('--mainnet');
const countArg = args.find((a) => /^\d+$/.test(a));
const count = countArg ? Math.min(parseInt(countArg, 10), 100) : 1;
const network = isMainnet ? networks.bitcoin : networks.opnetTestnet;
const networkLabel = isMainnet ? 'mainnet' : 'opnet-testnet';

console.log(`\nGenerating ${count} ${networkLabel} wallet(s)...\n`);

for (let i = 0; i < count; i++) {
    const keyPair = EcKeyPair.generateRandomKeyPair(network);
    const address = EcKeyPair.getTaprootAddress(keyPair, network);
    const wif = keyPair.toWIF();

    if (count > 1) console.log(`--- Wallet ${i + 1} ---`);
    console.log(`Address:   ${address}`);
    console.log(`WIF:       ${wif}`);
    console.log();
}

console.log('Store WIF keys securely. They cannot be recovered.\n');
