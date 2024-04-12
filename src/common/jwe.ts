import * as jose from "jose";
import { compactDecrypt, compactEncrypt, decodeProtectedHeader } from "jose";

// Encrypt JWE
export async function encryptJWE(
    data: string,
    key: JWK.Key,
    epk?: object,
): Promise<string> {
    const jwk = JWK.asKey(key);
    const encOptions = {
        contentEncryptionAlgorithm: "A256GCM",
        ...(epk && { epk }),
    };
    const { plaintext } = await compactEncrypt(
        Buffer.from(data),
        jwk,
        encOptions,
    );
    return plaintext.toString();
}

// Decrypt JWE
export async function decryptJWE(
    jweCompact: string,
    key: JWK.Key,
): Promise<string> {
    const jwk = JWK.asKey(key);
    const { plaintext } = await compactDecrypt(jweCompact, jwk);
    return Buffer.from(plaintext).toString();
}

// Extract JWE Header
export function extractJWEHeader(jweCompact: string): object {
    return decodeProtectedHeader(jweCompact);
}

/**
 * Creates a Compact JWE (JSON Web Encryption) object.
 * @param plainText The plaintext to be encrypted, which is compact JSON(e.g compact JWS), represented as a Uint8Array.
 * @returns A compact JWE string.
 */
export async function compactJwe(
    plainText: Uint8Array,
    header: jose.CompactJWEHeaderParameters,
    key: Uint8Array | jose.KeyLike,
    keyManagementParams?: jose.JWEKeyManagementHeaderParameters,
    option?: jose.EncryptOptions,
): Promise<string> {
    const compactEncrypt = new jose.CompactEncrypt(
        plainText,
    ).setProtectedHeader(header);

    if (keyManagementParams) {
        compactEncrypt.setKeyManagementParameters(keyManagementParams);
    }

    const compact_jwe = await compactEncrypt.encrypt(key, option);
    return compact_jwe;
}
