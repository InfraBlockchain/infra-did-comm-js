import { decode, encode } from "@stablelib/base64";
import { generateKeyPair, sharedKey } from "@stablelib/x25519";
import { CryptoHelper } from "infra-did-js";
import { JWK } from "jose";

import { privateKeyFromMnemonic, publicKeyFromMnemonic } from "./key_convert";

/**
 * Represents an ephemeral key pair.
 */
interface EphemeralKeyPair {
    ephemeralPrivateKey: Uint8Array;
    ephemeralPublicKey: Uint8Array;
}

/**
 * Generates an X25519 ephemeral key pair.
 * @returns The generated ephemeral key pair.
 */
export function generateX25519EphemeralKeyPair(): EphemeralKeyPair {
    const { publicKey, secretKey } = generateKeyPair();
    return { ephemeralPrivateKey: secretKey, ephemeralPublicKey: publicKey };
}

/**
 * Derives a shared key from a private key and a public key.
 * @param privateKey - The private key.
 * @param publicKey - The public key.
 * @returns The derived shared key.
 */
export function deriveSharedKey(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
): Uint8Array {
    return sharedKey(privateKey, publicKey);
}

/**
 * Converts an X25519 public key to a JWK (JSON Web Key) representation.
 * @param publicKey - The X25519 public key.
 * @returns The JWK representation of the X25519 public key.
 */
export function x25519JwkFromX25519PublicKey(publicKey: Uint8Array): JWK {
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(publicKey),
    };
}

/**
 * Converts an Ed25519 public key to an X25519 JWK (JSON Web Key) representation.
 * @param publicKey - The Ed25519 public key.
 * @returns The X25519 JWK representation of the Ed25519 public key.
 */
export function x25519JwkFromEd25519PublicKey(publicKey: Uint8Array): JWK {
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

/**
 * Converts a mnemonic to an X25519 JWK (JSON Web Key) representation.
 * @param mnemonic - The mnemonic.
 * @returns The X25519 JWK representation of the mnemonic.
 */
export function x25519JwkFromMnemonic(mnemonic: string): JWK {
    const publicKeyED25519 = publicKeyFromMnemonic(mnemonic);
    const privateKeyED25519 = privateKeyFromMnemonic(mnemonic);

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

/**
 * Converts a shared key to a JWK (JSON Web Key) representation.
 * @param sharedKey - The shared key.
 * @returns The JWK representation of the shared key.
 */
export function jwkFromSharedKey(sharedKey: Uint8Array): JWK {
    return {
        kty: "oct",
        k: encode(sharedKey),
        alg: "A256GCM",
    };
}

/**
 * Converts an X25519 JWK (JSON Web Key) representation to a public key.
 * @param jwk - The X25519 JWK representation.
 * @returns The public key.
 */
export function publicKeyfromX25519Jwk(jwk: JWK): Uint8Array {
    return decode(jwk["x"]);
}

/**
 * Converts an X25519 JWK (JSON Web Key) representation to a private key.
 * @param jwk - The X25519 JWK representation.
 * @returns The private key.
 */
export function privateKeyfromX25519Jwk(jwk: JWK): Uint8Array {
    return decode(jwk["d"]);
}
