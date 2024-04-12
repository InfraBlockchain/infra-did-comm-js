import base64url from "base64url";
import * as jose from "jose";
import { importJWK, jwtVerify,SignJWT } from "jose";

// Sign JWS
export async function signJWS(
    data: string,
    privateKey: string,
): Promise<string> {
    const jwk = await importJWK(
        { kty: "OKP", crv: "Ed25519", d: privateKey, alg: "EdDSA" },
        "EdDSA",
    );
    const token = await new SignJWT({ data })
        .setProtectedHeader({ typ: "JWM", alg: "EdDSA" })
        .sign(jwk);
    return token;
}

// Verify JWS
export async function verifyJWS(
    token: string,
    publicKey: string,
): Promise<object | undefined> {
    try {
        const jwk = await importJWK(
            { kty: "OKP", crv: "Ed25519", x: publicKey, alg: "EdDSA" },
            "EdDSA",
        );
        const { payload } = await jwtVerify(token, jwk, {
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
