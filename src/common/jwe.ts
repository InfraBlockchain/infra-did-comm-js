import * as jose from "jose";
import {
    compactDecrypt,
    CompactEncrypt,
    decodeProtectedHeader,
    importJWK,
} from "jose";

// Encrypt JWE
export async function encryptJWE(
    data: string,
    key: Record<string, any>,
    epk?: Record<string, any>,
): Promise<string> {
    const keyJwk = await importJWK(key);

    if (epk != null) {
        const epkJwk = await importJWK(epk);
        const compactJWE = await new CompactEncrypt(Buffer.from(data))
            .setProtectedHeader({ alg: "ECDH-ES", enc: "A256GCM" })
            .setKeyManagementParameters({ epk: epkJwk as jose.KeyLike })
            .encrypt(keyJwk);
        return compactJWE;
    } else {
        const compactJWE = await new CompactEncrypt(Buffer.from(data))
            .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
            .encrypt(keyJwk);
        return compactJWE;
    }
}

// Decrypt JWE
export async function decryptJWE(
    jweCompact: string,
    key: Record<string, any>,
): Promise<string> {
    const keyJwk = await importJWK(key);

    const { plaintext } = await compactDecrypt(jweCompact, keyJwk);
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
