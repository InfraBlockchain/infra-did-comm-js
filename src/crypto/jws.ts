import base64url from "base64url";
import { KeyObject } from "crypto";

import { jose, joseOriginal } from "../jose-config";

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
    key: Record<string, any>,
    protectedHeader: joseOriginal.CompactJWSHeaderParameters,
): Promise<string> {
    const keyLike = await jose.importJWK(key as joseOriginal.JWK);
    return new jose.CompactSign(payload)
        .setProtectedHeader(protectedHeader)
        .sign(keyLike);
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
    key: Record<string, any>,
): Promise<Record<string, any>> {
    try {
        const keyLike = await jose.importJWK(key);
        const { payload } = await jose.compactVerify(
            jws,
            keyLike as KeyObject,
            {
                algorithms: ["EdDSA"],
            },
        );

        const decodedPayload = new TextDecoder().decode(payload);
        const jsonPayload = JSON.parse(decodedPayload);

        return jsonPayload;
    } catch (error) {
        throw new Error(`Error in verifyJWS: ${error}`);
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
