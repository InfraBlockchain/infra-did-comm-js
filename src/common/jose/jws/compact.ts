import * as jose from "jose";

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
