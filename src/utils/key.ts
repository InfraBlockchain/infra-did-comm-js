import { decode, encode } from "@stablelib/base64";
import {
    generateKeyPair,
    generateKeyPairFromSeed,
    sharedKey,
} from "@stablelib/x25519";
import { CryptoHelper } from "infra-did-js";

import { privateKeyFromUri, publicKeyFromUri } from "./key_convert";

// Generate X25519 Ephemeral Key Pair
export async function generateX25519EphemeralKeyPair(): Promise<
    [Uint8Array, Uint8Array]
> {
    const { publicKey, secretKey } = generateKeyPair();
    return [secretKey, publicKey];
}

// Make 32-byte shared key from private key and public key
export async function makeSharedKey(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
): Promise<Uint8Array> {
    return sharedKey(privateKey, publicKey);
}

// X25519 JWK from X25519 Private Key
export async function x25519JwkFromX25519PrivateKey(
    privateKey: Uint8Array,
): Promise<Record<string, any>> {
    const { publicKey, secretKey } = generateKeyPairFromSeed(privateKey);
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(publicKey),
        d: encode(secretKey),
    };
}

// X25519 JWK from X25519 Public Key
export function x25519JwkFromX25519PublicKey(
    publicKey: Uint8Array,
): Record<string, any> {
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(publicKey),
    };
}

// X25519 JWK from Ed25519 Public Key
export function x25519JwkFromEd25519PublicKey(
    publicKey: Uint8Array,
): Record<string, any> {
    const x25519PublicKey = CryptoHelper.edToX25519Pk(
        publicKey,
        "u8a",
    ) as Uint8Array;
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(x25519PublicKey),
    };
}

// X25519 JWK from Ed25519 Private Key
export function x25519JwkFromMnemonic(mnemonic: string): Record<string, any> {
    // ED25519 sk -> ED25519 pk
    // ED25519 sk, pk -> X25519
    const publicKeyED25519 = publicKeyFromUri(mnemonic);
    const privateKeyED25519 = privateKeyFromUri(mnemonic);

    const priavteKeyX25519 = CryptoHelper.edToX25519Sk(
        publicKeyED25519,
        privateKeyED25519,
        "u8a",
    ) as Uint8Array;
    const publicKeyX25519 = CryptoHelper.edToX25519Pk(
        publicKeyED25519,
        "u8a",
    ) as Uint8Array;

    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(publicKeyX25519),
        d: encode(priavteKeyX25519),
    };
}

// JWK from Shared Key
export function jwkFromSharedKey(sharedKey: Uint8Array): Record<string, any> {
    return {
        kty: "oct",
        k: encode(sharedKey),
        alg: "A256GCM",
    };
}

// Public Key from X25519 JWK
export function publicKeyfromX25519Jwk(jwk: Record<string, any>): Uint8Array {
    return decode(jwk["x"]);
}

// Private Key from X25519 JWK
export function privateKeyfromX25519Jwk(jwk: Record<string, any>): Uint8Array {
    return decode(jwk["d"]);
}
