import base64url from "base64url";
import { KeyObject } from "crypto";
import * as jose from "jose";
import { jwtVerify } from "jose";

/**
 * Signs the provided payload using the given private key and protected header,
 * and returns the resulting compact JWS string.
 *
 * @param payload - The payload to be signed.
 * @param privateKey - The private key used for signing.
 * @param protectedHeader - The protected header parameters.
 * @returns A promise that resolves to the compact JWS string.
 */
export async function compactJWS(
    payload: Uint8Array,
    privateKey: jose.KeyLike | Uint8Array,
    protectedHeader: jose.CompactJWSHeaderParameters,
): Promise<string> {
    return new jose.CompactSign(payload)
        .setProtectedHeader(protectedHeader)
        .sign(privateKey);
}

/**
 * Verifies the provided JWS string using the given public key,
 * and returns the payload object if the verification is successful.
 *
 * @param jws - The JWS string to be verified.
 * @param publicKey - The public key used for verification.
 * @returns A promise that resolves to the payload object.
 */
export async function verifyJWS(
    jws: string,
    publicKey: KeyObject,
): Promise<object> {
    try {
        const { payload } = await jwtVerify(jws, publicKey, {
            algorithms: ["EdDSA"],
        });
        return payload;
    } catch (error) {
        console.error(error);
    }
}

/**
 * Decodes the provided JWS string and returns the payload object.
 *
 * @param jws - The JWS string to be decoded.
 * @returns The decoded payload object.
 */
export function decodeJWS(jws: string): object {
    const parts = jws.split(".");
    const payload = parts[1];
    return JSON.parse(base64url.decode(payload));
}
