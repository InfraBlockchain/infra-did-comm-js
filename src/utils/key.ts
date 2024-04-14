import { decode, encode } from "@stablelib/base64";
import {
    generateKeyPair,
    generateKeyPairFromSeed,
    sharedKey,
} from "@stablelib/x25519";
import { CryptoHelper } from "infra-did-js";

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
    const x25519PublicKey = CryptoHelper.edToX25519Pk(publicKey, "u8a");
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(x25519PublicKey as Uint8Array),
    };
}

// X25519 JWK from Ed25519 Private Key
export async function x25519JwkFromEd25519PrivateKey(
    privateKey: Uint8Array,
): Promise<Record<string, any>> {
    // Assuming publicKeyFromSeed is adapted to return Uint8Array
    // const ed25519PublicKey = publicKeyFromSeed(encode(privateKey)); // This may need to be adapted
    const x25519PublicKey = convertPublicKey(ed25519PublicKey);
    const x25519PrivateKey = convertSecretKey(privateKey);
    return {
        kty: "OKP",
        crv: "X25519",
        x: encode(x25519PublicKey),
        d: encode(x25519PrivateKey),
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
