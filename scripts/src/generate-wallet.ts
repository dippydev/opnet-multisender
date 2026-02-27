/**
 * Generate a fresh, independent Bitcoin wallet (no seed phrase required).
 *
 * Usage:
 *   npx tsx src/generate-wallet.ts
 *   npx tsx src/generate-wallet.ts --count 5
 */
import { EcKeyPair } from '@btc-vision/transaction';
import { NETWORK } from './config.js';

const count = (() => {
    const idx = process.argv.indexOf('--count');
    if (idx !== -1 && process.argv[idx + 1]) {
        const n = parseInt(process.argv[idx + 1], 10);
        if (n > 0 && n <= 100) return n;
    }
    return 1;
})();

console.log(`Generating ${count} wallet(s) on ${NETWORK.bech32 ?? 'unknown'} network...\n`);

for (let i = 0; i < count; i++) {
    const keyPair = EcKeyPair.generateRandomKeyPair(NETWORK);
    const address = EcKeyPair.getTaprootAddress(keyPair, NETWORK);
    const wif = keyPair.toWIF();

    if (count > 1) {
        console.log(`--- Wallet ${i + 1} ---`);
    }
    console.log(`Address:     ${address}`);
    console.log(`WIF (key):   ${wif}`);
    console.log();
}

console.log('Store the WIF securely. It cannot be recovered.');
