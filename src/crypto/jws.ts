import base64url from "base64url";
import { KeyObject } from "crypto";
import * as jose from "jose";
import { importJWK, jwtVerify, SignJWT } from "jose";

// Sign JWS
export async function signJWS(
    data: string,
    privateKey: string,
): Promise<string> {
    const jwk = await importJWK(
        {
            kty: "OKP",
            crv: "Ed25519",
            d: privateKey,
            x: privateKey,
            alg: "EdDSA",
        },
        "EdDSA",
    );
    const token = await new SignJWT({ data })
        .setProtectedHeader({ typ: "JWM", alg: "EdDSA" })
        .sign(jwk);
    return token;
}

// Verify JWS
export async function verifyJWS(
    jws: string,
    publicKey: KeyObject,
): Promise<object | undefined> {
    try {
        const { payload } = await jwtVerify(jws, publicKey, {
            algorithms: ["EdDSA"],
        });
        return payload;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

// Decode JWS (without verification)
export function decodeJWS(token: string): object {
    const parts = token.split(".");
    const payload = parts[1];
    return JSON.parse(base64url.decode(payload));
}

/**
 * Creates a Compact JSON Web Signature (JWS) using the provided payload, private key, and protected header.
 * @param payload The payload to be signed, represented as a Uint8Array.
 * @param privateKey The private key used for signing, either in a KeyLike format or as a Uint8Array.
 * @param protectedHeader The protected header parameters for the JWS.
 * @returns A Promise that resolves to a string representing the CompactJWS.
 */
export async function compactJws(
    payload: Uint8Array,
    privateKey: jose.KeyLike | Uint8Array,
    protectedHeader: jose.CompactJWSHeaderParameters,
): Promise<string> {
    return new jose.CompactSign(payload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);
}
