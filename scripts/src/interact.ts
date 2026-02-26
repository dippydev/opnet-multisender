/**
 * Admin CLI for the deployed MultiSender contract.
 *
 * Usage:
 *   npx tsx src/interact.ts --help
 *   npx tsx src/interact.ts --get-owner
 *   npx tsx src/interact.ts --get-fee
 *   npx tsx src/interact.ts --is-paused
 *   npx tsx src/interact.ts --pause
 *   npx tsx src/interact.ts --unpause
 *   npx tsx src/interact.ts --set-fee <amount>
 *   npx tsx src/interact.ts --transfer-ownership <address>
 *
 * Prerequisites:
 *   - Contract address set in addresses.json (after deployment)
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

// ── Inline ABI (authoritative source: contracts/abis/multisender/) ──
const MULTISENDER_ABI: BitcoinInterfaceAbi = [
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
        inputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getFee',
        inputs: [],
        outputs: [{ name: 'fee', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
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
    {
        name: 'MultiSendExecuted',
        values: [
            { name: 'sender', type: ABIDataTypes.ADDRESS },
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'totalAmount', type: ABIDataTypes.UINT256 },
            { name: 'recipientCount', type: ABIDataTypes.UINT256 },
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
        values: [{ name: 'newFee', type: ABIDataTypes.UINT256 }],
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

// ── Type-safe contract interface ─────────────────────────────────────
type EmptyResult = CallResult<Record<string, never>, OPNetEvent<never>[]>;

interface IMultiSender extends IOP_NETContract {
    multiSend(token: Address, recipients: Address[], amounts: bigint[]): Promise<EmptyResult>;
    multiSendEqual(token: Address, recipients: Address[], amountEach: bigint): Promise<EmptyResult>;
    setFee(fee: bigint): Promise<EmptyResult>;
    getFee(): Promise<CallResult<{ fee: bigint }, OPNetEvent<never>[]>>;
    getOwner(): Promise<CallResult<{ owner: Address }, OPNetEvent<never>[]>>;
    isPaused(): Promise<CallResult<{ paused: boolean }, OPNetEvent<never>[]>>;
    pause(): Promise<EmptyResult>;
    unpause(): Promise<EmptyResult>;
    transferOwnership(newOwner: Address): Promise<EmptyResult>;
}

// ── Help text ────────────────────────────────────────────────────────
const HELP = `
MultiSender Admin CLI

Read-only commands:
  --get-owner              Show the current contract owner
  --get-fee                Show the current fee (raw u256)
  --is-paused              Show whether the contract is paused

Write commands (simulates first, then sends on-chain):
  --pause                  Pause the contract (owner only)
  --unpause                Unpause the contract (owner only)
  --set-fee <amount>       Set the fee amount (owner only)
  --transfer-ownership <address>  Transfer ownership (owner only)

Options:
  --help                   Show this help message
`.trim();

// ── Helpers ──────────────────────────────────────────────────────────
function getFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

function getFlagValue(flag: string): string | undefined {
    const idx = process.argv.indexOf(flag);
    if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
    return process.argv[idx + 1];
}

// ── Main ─────────────────────────────────────────────────────────────
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
    const contractAddrStr = addrs.contract;
    if (!contractAddrStr) {
        throw new Error(
            'Contract address not set in addresses.json. Run `npx tsx src/deploy.ts` first.',
        );
    }

    console.log('Contract:', contractAddrStr);
    const contractAddr = await provider.getPublicKeyInfo(contractAddrStr, true);
    const senderAddr = await provider.getPublicKeyInfo(wallet.p2tr, false);
    console.log('');

    // Get contract instance
    const contract = getContract<IMultiSender>(
        contractAddr,
        MULTISENDER_ABI,
        provider,
        NETWORK,
        senderAddr,
    );

    // ── Read-only commands ───────────────────────────────────────────
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
            console.log('Fee:', result.properties.fee.toString());
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

    // ── Write commands ───────────────────────────────────────────────
    if (getFlag('--pause')) {
        console.log('Simulating pause()...');
        const simulation = await contract.pause();

        if (simulation.revert) {
            console.log('Simulation REVERTED:', simulation.revert);
        } else {
            console.log('Simulation SUCCESS — gas:', simulation.estimatedGas?.toString() ?? 'N/A');
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
    }

    if (getFlag('--unpause')) {
        console.log('Simulating unpause()...');
        const simulation = await contract.unpause();

        if (simulation.revert) {
            console.log('Simulation REVERTED:', simulation.revert);
        } else {
            console.log('Simulation SUCCESS — gas:', simulation.estimatedGas?.toString() ?? 'N/A');
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
    }

    if (getFlag('--set-fee')) {
        const feeStr = getFlagValue('--set-fee');
        if (!feeStr) {
            console.error('Error: --set-fee requires a numeric amount. Example: --set-fee 1000');
            process.exit(1);
        }

        const fee = BigInt(feeStr);
        console.log(`Simulating setFee(${fee})...`);
        const simulation = await contract.setFee(fee);

        if (simulation.revert) {
            console.log('Simulation REVERTED:', simulation.revert);
        } else {
            console.log('Simulation SUCCESS — gas:', simulation.estimatedGas?.toString() ?? 'N/A');
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

        if (simulation.revert) {
            console.log('Simulation REVERTED:', simulation.revert);
        } else {
            console.log('Simulation SUCCESS — gas:', simulation.estimatedGas?.toString() ?? 'N/A');
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
