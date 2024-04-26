import { generateKeyPair, sharedKey } from "@stablelib/x25519";
import base64url from "base64url";
import { CryptoHelper, PrivateJwk_ED, PublicJwk_ED } from "infra-did-js";

import { joseOriginal } from "../jose-config";
import { escape } from "./coding";
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
export function x25519JwkFromX25519PublicKey(
    publicKey: Uint8Array,
): joseOriginal.JWK {
    return {
        kty: "OKP",
        crv: "X25519",
        x: base64url.encode(Buffer.from(publicKey)),
    };
}

/**
 * Converts an Ed25519 public key to an X25519 JWK (JSON Web Key) representation.
 * @param publicKey - The Ed25519 public key.
 * @returns The X25519 JWK representation of the Ed25519 public key.
 */
export function x25519JwkFromEd25519PublicKey(
    publicKey: Uint8Array,
): joseOriginal.JWK {
    const x25519PublicKey = CryptoHelper.edToX25519Pk(
        publicKey,
        "u8a",
    ) as Uint8Array;
    return {
        kty: "OKP",
        crv: "X25519",
        x: base64url.encode(Buffer.from(x25519PublicKey)),
    };
}

/**
 * Converts a mnemonic to an X25519 JWK (JSON Web Key) representation.
 * @param mnemonic - The mnemonic.
 * @returns The X25519 JWK representation of the mnemonic.
 */
export function x25519JwkFromMnemonic(mnemonic: string): joseOriginal.JWK {
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
        x: base64url.encode(Buffer.from(publicKeyX25519)),
        d: base64url.encode(Buffer.from(priavteKeyX25519)),
    };
}

/**
 * Converts a shared key to a JWK (JSON Web Key) representation.
 * @param sharedKey - The shared key.
 * @returns The JWK representation of the shared key.
 */
export function jwkFromSharedKey(sharedKey: Uint8Array): joseOriginal.JWK {
    return {
        kty: "oct",
        k: joseOriginal.base64url.encode(Buffer.from(sharedKey)),
        alg: "A256GCM",
    };
}

/**
 * Converts an X25519 JWK (JSON Web Key) representation to a public key.
 * @param jwk - The X25519 JWK representation.
 * @returns The public key.
 */
export function publicKeyfromX25519Jwk(jwk: joseOriginal.JWK): Uint8Array {
    return joseOriginal.base64url.decode(jwk["x"]);
}

/**
 * Converts an X25519 JWK (JSON Web Key) representation to a private key.
 * @param jwk - The X25519 JWK representation.
 * @returns The private key.
 */
export function privateKeyfromX25519Jwk(jwk: joseOriginal.JWK): Uint8Array {
    return joseOriginal.base64url.decode(jwk["d"]);
}

/**
 * Converts a key to a JSON Web Key (JWK) format.
 * @param crv The curve type of the key ("Ed25519" or "X25519").
 * @param pk The public key as a Uint8Array.
 * @param sk The secret key as a Uint8Array (optional).
 * @returns The key in JWK format.
 */
export function key2JWK(
    crv: "Ed25519" | "X25519",
    pk: Uint8Array,
    sk?: Uint8Array,
): PublicJwk_ED | PrivateJwk_ED {
    const jwk: PublicJwk_ED = {
        alg: "EdDSA",
        kty: "OKP",
        crv,
        x: escape(Buffer.from(pk).toString("base64")),
    };

    if (sk) {
        return {
            ...jwk,
            d: escape(Buffer.from(sk).toString("base64")),
        } as PrivateJwk_ED;
    }

    return jwk;
}
