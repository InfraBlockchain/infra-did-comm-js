import { Keyring } from "@polkadot/keyring";
import { hexToU8a } from "@polkadot/util";
import {
    ed25519PairFromSeed,
    mnemonicToMiniSecret,
} from "@polkadot/util-crypto";

export async function publicKeyFromUri(uri: string): Promise<Uint8Array> {
    // Assuming `uri` contains the mnemonic
    const seed = mnemonicToMiniSecret(uri);
    const { publicKey } = ed25519PairFromSeed(seed);
    return publicKey;
}

export function publicKeyFromSeed(seed: string): Uint8Array {
    const seedBytes = hexToU8a(seed);
    const { publicKey } = ed25519PairFromSeed(seedBytes);
    return publicKey;
}

export async function privateKeyFromUri(uri: string): Promise<Uint8Array> {
    // Assuming `uri` contains the mnemonic
    const seed = mnemonicToMiniSecret(uri);
    return seed; // `seed` here is the mini secret (private key) from the mnemonic
}

export async function extendedPrivateKeyFromUri(
    uri: string,
): Promise<Uint8Array> {
    const publicKey = await publicKeyFromUri(uri);
    const privateKey = await privateKeyFromUri(uri);
    const extendedPrivateKey = new Uint8Array([...privateKey, ...publicKey]);
    return extendedPrivateKey;
}

export function extendedPrivateKeyFromSeed(seed: string): Uint8Array {
    const publicKey = publicKeyFromSeed(seed);
    const privateKey = hexToU8a(seed); // Assuming `seed` is the hex representation of the private key
    const extendedPrivateKey = new Uint8Array([...privateKey, ...publicKey]);
    return extendedPrivateKey;
}

export function publicKeyFromAddress(address: string): Uint8Array {
    const keyring = new Keyring();
    const publicKey = keyring.decodeAddress(address);
    return publicKey;
}
