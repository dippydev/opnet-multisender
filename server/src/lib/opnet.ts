import { JSONRpcProvider, getContract, OP_20_ABI, type IOP20Contract } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const RPC_URL = process.env.RPC_URL || 'https://testnet.opnet.org';

let provider: JSONRpcProvider | null = null;

/** Get or create a shared JSONRpcProvider instance */
export function getProvider(): JSONRpcProvider {
    if (!provider) {
        provider = new JSONRpcProvider({
            url: RPC_URL,
            network: networks.opnetTestnet,
        });
    }
    return provider;
}

export interface TokenMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
}

/** Fetch OP20 token metadata from the chain */
export async function fetchTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
        const p = getProvider();
        const contractAddr = await p.getPublicKeyInfo(tokenAddress, true);

        // Use the contract's own address as sender for read-only calls
        const token = getContract<IOP20Contract>(
            contractAddr,
            OP_20_ABI,
            p,
            networks.opnetTestnet,
            contractAddr,
        );

        const [nameResult, symbolResult, decimalsResult] = await Promise.all([
            token.name(),
            token.symbol(),
            token.decimals(),
        ]);

        return {
            address: tokenAddress,
            name: String(nameResult.properties.name),
            symbol: String(symbolResult.properties.symbol),
            decimals: Number(decimalsResult.properties.decimals),
        };
    } catch (err) {
        console.error(`Failed to fetch metadata for ${tokenAddress}:`, err);
        return null;
    }
}
