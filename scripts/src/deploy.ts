/**
 * Deploy the MultiSender contract to OPNet testnet.
 *
 * Usage:
 *   npm run deploy
 *
 * Prerequisites:
 *   1. Contract compiled: npm run build (from contracts/)
 *   2. Wallet funded with testnet BTC
 *   3. WIF_PRIVATE_KEY + OPNET_MNEMONIC set in .env
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSONRpcProvider } from 'opnet';
import {
    TransactionFactory,
    type IDeploymentParameters,
} from '@btc-vision/transaction';
import { NETWORK, RPC_URL, saveAddress } from './config.js';
import { createWallet } from './wallet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = resolve(__dirname, '../../contracts/build/MultiSender.wasm');

async function main(): Promise<void> {
    if (!existsSync(WASM_PATH)) {
        console.error('MultiSender WASM not found at:', WASM_PATH);
        console.error('');
        console.error('Build the contract first:');
        console.error('  cd ../contracts && npm run build');
        process.exit(1);
    }

    const wasmBytes = new Uint8Array(readFileSync(WASM_PATH));
    console.log('Contract binary size:', wasmBytes.length, 'bytes');

    const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    const wallet = createWallet(NETWORK);

    console.log('Deployer address:', wallet.p2tr);
    console.log('Network:', RPC_URL);
    console.log('');

    const balance = await provider.getBalance(wallet.p2tr);
    console.log('Deployer balance:', balance.toString(), 'sats');

    if (balance === 0n) {
        console.error('');
        console.error('No funds! Request testnet BTC first.');
        provider.close();
        process.exit(1);
    }

    const utxos = await provider.utxoManager.getUTXOs({
        address: wallet.p2tr,
        optimize: false,
    });

    if (utxos.length === 0) {
        console.error('No UTXOs available. Fund the wallet first.');
        provider.close();
        process.exit(1);
    }

    console.log('Available UTXOs:', utxos.length);
    const totalValue = utxos.reduce((sum, u) => sum + u.value, 0n);
    console.log('Total UTXO value:', totalValue.toString(), 'sats');
    console.log('');

    console.log('Fetching challenge...');
    const challenge = await provider.getChallenge();
    console.log('Challenge obtained.');
    console.log('');

    const deploymentParams: IDeploymentParameters = {
        from: wallet.p2tr,
        utxos: utxos,
        signer: wallet.signer,
        mldsaSigner: wallet.mldsaSigner,
        network: NETWORK,
        feeRate: 5,
        priorityFee: 0n,
        gasSatFee: 10_000n,
        bytecode: wasmBytes,
        challenge: challenge,
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey: true,
    };

    console.log('Signing deployment...');
    const factory = new TransactionFactory();
    const deployment = await factory.signDeployment(deploymentParams);

    console.log('');
    console.log('=== Deployment Signed ===');
    console.log('Contract address:', deployment.contractAddress);
    console.log('');

    console.log('Broadcasting funding transaction...');
    const fundingResult = await provider.sendRawTransaction(
        deployment.transaction[0],
        false,
    );
    console.log('Funding TX broadcast. Result:', JSON.stringify(fundingResult));

    console.log('Broadcasting reveal transaction...');
    const revealResult = await provider.sendRawTransaction(
        deployment.transaction[1],
        false,
    );
    console.log('Reveal TX broadcast. Result:', JSON.stringify(revealResult));

    console.log('');
    console.log('=== Deployment Complete ===');
    console.log('Contract address:', deployment.contractAddress);
    console.log('');

    saveAddress('contract', deployment.contractAddress);
    console.log('Contract address saved to addresses.json');

    console.log('');
    console.log('Next steps:');
    console.log('  Wait for the block to confirm (~2.5 min on testnet)');
    console.log('  Then use interact.ts to manage the contract');

    provider.close();
}

main().catch((err: unknown) => {
    if (err instanceof Error) {
        console.error('Deployment failed:', err.message);
        if (err.stack) console.error(err.stack);
    } else {
        console.error('Deployment failed:', String(err));
    }
    process.exit(1);
});
