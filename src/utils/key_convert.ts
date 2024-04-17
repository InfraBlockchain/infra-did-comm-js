import { Keyring } from "@polkadot/keyring";
import {
    ed25519PairFromSeed,
    mnemonicToMiniSecret,
} from "@polkadot/util-crypto";

/**
 * Retrieves the public key from a given mnemonic.
 * @param mnemonic The mnemonic phrase.
 * @returns The public key as a Uint8Array.
 */
export function publicKeyFromMnemonic(mnemonic: string): Uint8Array {
    const seed = mnemonicToMiniSecret(mnemonic);
    const { publicKey } = ed25519PairFromSeed(seed);
    return publicKey;
}

/**
 * Retrieves the private key from a given mnemonic.
 * @param mnemonic The mnemonic phrase.
 * @returns The private key as a Uint8Array.
 */
export function privateKeyFromMnemonic(mnemonic: string): Uint8Array {
    const privateKey = mnemonicToMiniSecret(mnemonic);
    return privateKey;
}

/**
 * Retrieves the public key from a given address.
 * @param address The address.
 * @returns The public key as a Uint8Array.
 */
export function publicKeyFromAddress(address: string): Uint8Array {
    const keyring = new Keyring();
    const publicKey = keyring.decodeAddress(address);
    return publicKey;
}
