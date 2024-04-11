import * as jose from "jose";

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
    const compactEncrypt = new jose.CompactEncrypt(plainText).setProtectedHeader(
        header,
    );

    if (keyManagementParams) {
        compactEncrypt.setKeyManagementParameters(keyManagementParams);
    }

    const compact_jwe = await compactEncrypt.encrypt(key, option);
    return compact_jwe;
}
