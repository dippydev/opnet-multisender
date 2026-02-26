/**
 * Shared wallet helper — builds an ECDSA signer from WIF and
 * optionally attaches an ML-DSA quantum signer from the mnemonic.
 */
import { type Network } from '@btc-vision/bitcoin';
import {
    EcKeyPair,
    Mnemonic,
    MLDSASecurityLevel,
    AddressTypes,
    type QuantumBIP32Interface,
} from '@btc-vision/transaction';
import { type UniversalSigner } from '@btc-vision/ecpair';
import { getWifKey, getMnemonic } from './config.js';

export interface AppWallet {
    /** ECDSA signer (from WIF) — used for all Bitcoin tx signing */
    signer: UniversalSigner;
    /** ML-DSA quantum signer (from mnemonic) — null if mnemonic not set */
    mldsaSigner: QuantumBIP32Interface | null;
    /** Taproot address (opt1p... on testnet, bc1p... on mainnet) */
    p2tr: string;
}

/**
 * Create a wallet from environment keys.
 *
 * - ECDSA signer comes from WIF_PRIVATE_KEY (fast, no BIP32 derivation).
 * - ML-DSA signer comes from OPNET_MNEMONIC if present (needed for
 *   quantum-linked transactions like deployment).
 */
export function createWallet(network: Network): AppWallet {
    const signer = EcKeyPair.fromWIF(getWifKey(), network);
    const p2tr = EcKeyPair.getTaprootAddress(signer, network);

    let mldsaSigner: QuantumBIP32Interface | null = null;
    const mnemonicPhrase = getMnemonic();
    if (mnemonicPhrase) {
        const mnemonic = new Mnemonic(
            mnemonicPhrase,
            '',
            network,
            MLDSASecurityLevel.LEVEL2,
        );
        const wallet = mnemonic.deriveOPWallet(AddressTypes.P2TR, 0);
        mldsaSigner = wallet.mldsaKeypair;
    }

    return { signer, mldsaSigner, p2tr };
}
