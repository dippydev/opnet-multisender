/**
 * Admin CLI for the deployed BobMultiSender contract.
 *
 * Usage:
 *   npx tsx src/interact-bob.ts --help
 *
 * Read-only:
 *   npx tsx src/interact-bob.ts --get-owner
 *   npx tsx src/interact-bob.ts --get-fee
 *   npx tsx src/interact-bob.ts --get-treasury
 *   npx tsx src/interact-bob.ts --is-paused
 *
 * Write (owner only):
 *   npx tsx src/interact-bob.ts --pause
 *   npx tsx src/interact-bob.ts --unpause
 *   npx tsx src/interact-bob.ts --set-fee <bps>
 *   npx tsx src/interact-bob.ts --set-treasury <address>
 *   npx tsx src/interact-bob.ts --transfer-ownership <address>
 *
 * Prerequisites:
 *   - BobMultiSender deployed (bobContract key in addresses.json)
 *   - WIF_PRIVATE_KEY + OPNET_MNEMONIC set in .env
 */
import { Address, ABIDataTypes } from '@btc-vision/transaction';
import {
    BitcoinAbiTypes,
    type BitcoinInterfaceAbi,
    type CallResult,
    getContract,
    type IOP_NETContract,
    JSONRpcProvider,
    type OPNetEvent,
    OP_NET_ABI,
} from 'opnet';
import { loadAddresses, NETWORK, RPC_URL } from './config.js';
import { createWallet } from './wallet.js';

// ── ABI (matches BobMultiSender.abi.json) ──────────────────────────
const BOB_MULTISENDER_ABI: BitcoinInterfaceAbi = [
    {
        name: 'multiSend',
        inputs: [
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
            { name: 'amounts', type: ABIDataTypes.ARRAY_OF_UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'multiSendEqual',
        inputs: [
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'recipients', type: ABIDataTypes.ARRAY_OF_ADDRESSES },
            { name: 'amountEach', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setFee',
        inputs: [{ name: 'feeBps', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setTreasury',
        inputs: [{ name: 'newTreasury', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFee',
        inputs: [],
        outputs: [{ name: 'feeBps', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getTreasury',
        inputs: [],
        outputs: [{ name: 'treasury', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isPaused',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'pause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unpause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'transferOwnership',
        inputs: [{ name: 'newOwner', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    // Events
    {
        name: 'MultiSendExecuted',
        values: [
            { name: 'sender', type: ABIDataTypes.ADDRESS },
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'recipientCount', type: ABIDataTypes.UINT256 },
            { name: 'feeAmount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'OwnershipTransferred',
        values: [
            { name: 'previousOwner', type: ABIDataTypes.ADDRESS },
            { name: 'newOwner', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'FeeUpdated',
        values: [{ name: 'newFeeBps', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'TreasuryUpdated',
        values: [{ name: 'newTreasury', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Paused',
        values: [],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Unpaused',
        values: [],
        type: BitcoinAbiTypes.Event,
    },
    ...OP_NET_ABI,
];

// ── Contract interface ──────────────────────────────────────────────
type EmptyResult = CallResult<Record<string, never>, OPNetEvent<never>[]>;

interface IBobMultiSender extends IOP_NETContract {
    multiSend(token: Address, recipients: Address[], amounts: bigint[]): Promise<EmptyResult>;
    multiSendEqual(token: Address, recipients: Address[], amountEach: bigint): Promise<EmptyResult>;
    setFee(feeBps: bigint): Promise<EmptyResult>;
    setTreasury(newTreasury: Address): Promise<EmptyResult>;
    getFee(): Promise<CallResult<{ feeBps: bigint }, OPNetEvent<never>[]>>;
    getOwner(): Promise<CallResult<{ owner: Address }, OPNetEvent<never>[]>>;
    getTreasury(): Promise<CallResult<{ treasury: Address }, OPNetEvent<never>[]>>;
    isPaused(): Promise<CallResult<{ paused: boolean }, OPNetEvent<never>[]>>;
    pause(): Promise<EmptyResult>;
    unpause(): Promise<EmptyResult>;
    transferOwnership(newOwner: Address): Promise<EmptyResult>;
}

// ── Help text ───────────────────────────────────────────────────────
const HELP = `
BobMultiSender Admin CLI

Read-only commands:
  --get-owner              Show the current contract owner
  --get-fee                Show the fee rate in basis points
  --get-treasury           Show the treasury address
  --is-paused              Show whether the contract is paused

Write commands (simulates first, then sends on-chain):
  --pause                  Pause the contract (owner only)
  --unpause                Unpause the contract (owner only)
  --set-fee <bps>          Set fee in basis points, max 500 (owner only)
  --set-treasury <address> Set the treasury address (owner only)
  --transfer-ownership <address>  Transfer ownership (owner only)

Options:
  --help                   Show this help message
`.trim();

// ── Helpers ─────────────────────────────────────────────────────────
function getFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

function getFlagValue(flag: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
    return process.argv[idx + 1];
}

/** Simulate, then send a write transaction. */
async function simulateAndSend(
    label: string,
    simulation: EmptyResult,
    wallet: ReturnType<typeof createWallet>,
): Promise<void> {
    if (simulation.revert) {
        console.log(`${label} REVERTED:`, simulation.revert);
        return;
    }

    console.log(`${label} simulation SUCCESS — gas:`, simulation.estimatedGas?.toString() ?? 'N/A');
    console.log('Sending transaction...');

    const receipt = await simulation.sendTransaction({
        signer: wallet.signer,
        mldsaSigner: wallet.mldsaSigner,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: 100_000n,
        network: NETWORK,
        feeRate: 5,
    });

    console.log('Transaction broadcast! TX:', receipt.transactionId);
}

// ── Main ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
    if (getFlag('--help') || process.argv.length <= 2) {
        console.log(HELP);
        return;
    }

    const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    const wallet = createWallet(NETWORK);

    console.log('Wallet:', wallet.p2tr);
    console.log('RPC:', RPC_URL);
    console.log('');

    // Resolve contract address
    const addrs = loadAddresses();
    const contractAddrStr = addrs.bobContract;
    if (!contractAddrStr) {
        throw new Error(
            'BobMultiSender address not set in addresses.json (key: bobContract). Run deploy-bob.ts first.',
        );
    }

    console.log('Contract:', contractAddrStr);

    // Resolve addresses. getPublicKeyInfo(addr, false) throws if ML-DSA
    // isn't linked on-chain yet (e.g. deployment block hasn't confirmed).
    let contractAddr;
    try {
        contractAddr = await provider.getPublicKeyInfo(contractAddrStr, true);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
            `Cannot resolve contract address. The deployment block may not have confirmed yet.\n` +
            `Wait ~2.5 min and try again.\n` +
            `Detail: ${msg}`,
        );
    }

    let senderAddr;
    try {
        senderAddr = await provider.getPublicKeyInfo(wallet.p2tr, false);
    } catch {
        // ML-DSA not linked yet — use the contract address as sender for
        // read-only calls. Write commands will fail until ML-DSA is linked.
        console.log('WARNING: Wallet ML-DSA not linked on-chain yet.');
        console.log('  Read-only commands will work. Write commands may fail.');
        console.log('  If deployment just completed, wait for block confirmation (~2.5 min).');
        console.log('');
        senderAddr = contractAddr;
    }
    console.log('');

    const contract = getContract<IBobMultiSender>(
        contractAddr,
        BOB_MULTISENDER_ABI,
        provider,
        NETWORK,
        senderAddr,
    );

    // ── Read-only commands ──────────────────────────────────────────
    if (getFlag('--get-owner')) {
        const result = await contract.getOwner();
        if (result.revert) {
            console.log('getOwner REVERTED:', result.revert);
        } else {
            console.log('Owner:', result.properties.owner.toString());
        }
    }

    if (getFlag('--get-fee')) {
        const result = await contract.getFee();
        if (result.revert) {
            console.log('getFee REVERTED:', result.revert);
        } else {
            const bps = result.properties.feeBps;
            const pct = Number(bps) / 100;
            console.log(`Fee: ${bps.toString()} bps (${pct}%)`);
        }
    }

    if (getFlag('--get-treasury')) {
        const result = await contract.getTreasury();
        if (result.revert) {
            console.log('getTreasury REVERTED:', result.revert);
        } else {
            console.log('Treasury:', result.properties.treasury.toString());
        }
    }

    if (getFlag('--is-paused')) {
        const result = await contract.isPaused();
        if (result.revert) {
            console.log('isPaused REVERTED:', result.revert);
        } else {
            console.log('Paused:', result.properties.paused);
        }
    }

    // ── Write commands ──────────────────────────────────────────────
    if (getFlag('--pause')) {
        console.log('Simulating pause()...');
        const simulation = await contract.pause();
        await simulateAndSend('pause()', simulation, wallet);
    }

    if (getFlag('--unpause')) {
        console.log('Simulating unpause()...');
        const simulation = await contract.unpause();
        await simulateAndSend('unpause()', simulation, wallet);
    }

    if (getFlag('--set-fee')) {
        const bpsStr = getFlagValue('--set-fee');
        if (!bpsStr) {
            console.error('Error: --set-fee requires basis points (0-500). Example: --set-fee 50');
            process.exit(1);
        }

        const bps = BigInt(bpsStr);
        if (bps > 500n) {
            console.error('Error: max fee is 500 bps (5%). Got:', bps.toString());
            process.exit(1);
        }

        console.log(`Simulating setFee(${bps} bps = ${Number(bps) / 100}%)...`);
        const simulation = await contract.setFee(bps);
        await simulateAndSend('setFee()', simulation, wallet);
    }

    if (getFlag('--set-treasury')) {
        const treasuryStr = getFlagValue('--set-treasury');
        if (!treasuryStr) {
            console.error('Error: --set-treasury requires an address. Example: --set-treasury opt1p...');
            process.exit(1);
        }

        console.log(`Resolving treasury address: ${treasuryStr}`);
        const treasuryAddr = await provider.getPublicKeyInfo(treasuryStr, true);

        console.log(`Simulating setTreasury(${treasuryStr})...`);
        const simulation = await contract.setTreasury(treasuryAddr);
        await simulateAndSend('setTreasury()', simulation, wallet);
    }

    if (getFlag('--transfer-ownership')) {
        const newOwnerStr = getFlagValue('--transfer-ownership');
        if (!newOwnerStr) {
            console.error('Error: --transfer-ownership requires an address. Example: --transfer-ownership opt1p...');
            process.exit(1);
        }

        console.log(`Resolving new owner address: ${newOwnerStr}`);
        const newOwnerAddr = await provider.getPublicKeyInfo(newOwnerStr, true);

        console.log(`Simulating transferOwnership(${newOwnerStr})...`);
        const simulation = await contract.transferOwnership(newOwnerAddr);
        await simulateAndSend('transferOwnership()', simulation, wallet);
    }

    provider.close();
}

main().catch((err: unknown) => {
    if (err instanceof Error) {
        console.error('Failed:', err.message);
        if (err.stack) console.error(err.stack);
    } else {
        console.error('Failed:', String(err));
    }
    process.exit(1);
});
