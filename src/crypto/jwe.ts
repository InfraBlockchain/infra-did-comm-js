import base64url from "base64url";
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
    const keyJwk = await importJWK(key as jose.JWK);

    const payloadU8A = new TextEncoder().encode(data);

    if (epk != null) {
        const compactJWE = await new CompactEncrypt(payloadU8A)
            .setProtectedHeader({
                alg: "dir",
                enc: "A256GCM",
                epk,
            })
            .encrypt(keyJwk);

        // const compactJWE = await new CompactEncrypt(payloadU8A)
        //     .setProtectedHeader({
        //         alg: "dir",
        //         enc: "A256GCM",
        //         epk,
        //     })
        //     .encrypt(keyJwk);
        const splitCompactJWE = compactJWE.split(".");

        const protectedHeader = JSON.parse(
            base64url.decode(splitCompactJWE[0]),
        );

        protectedHeader["alg"] = "ECDH-ES";
        splitCompactJWE[0] = base64url.encode(JSON.stringify(protectedHeader));
        const aggregated = splitCompactJWE.join(".");

        return aggregated;
    } else {
        const compactJWE = await new CompactEncrypt(Buffer.from(data))
            .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
            .encrypt(keyJwk);
        return compactJWE;
    }
}

// Decrypt JWE
export async function decryptJWE(
    compactJWE: string,
    key: Record<string, any>,
): Promise<string> {
    const keyJwk = await importJWK(key as jose.JWK);
    const splitCompactJWE = compactJWE.split(".");
    const protectedHeader = JSON.parse(base64url.decode(splitCompactJWE[0]));
    console.log("before delete: ", protectedHeader);

    protectedHeader["alg"] = "dir";

    splitCompactJWE[0] = base64url.encode(JSON.stringify(protectedHeader));
    const aggregatedCompactJWE = splitCompactJWE.join(".");

    console.log("when decrypt keyJWK: ", keyJwk);

    const { plaintext } = await compactDecrypt(aggregatedCompactJWE, keyJwk);
    // const { plaintext } = await compactDecrypt(aggregatedCompactJWE, keyJwk);
    console.log("plaintext", plaintext);
    return Buffer.from(plaintext).toString();
}

// Extract JWE Header
export function extractJWEHeader(jweCompact: string): object {
    try {
        return decodeProtectedHeader(jweCompact);
    } catch (error) {
        // Return default "dir" header if protected header doesn't exist
        return { alg: "dir" };
    }
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
    console.log("compactJwe, plainText", plainText);
    const compactEncrypt = new jose.CompactEncrypt(
        plainText,
    ).setProtectedHeader(header);

    if (keyManagementParams) {
        compactEncrypt.setKeyManagementParameters(keyManagementParams);
    }

    const compact_jwe = await compactEncrypt.encrypt(key, option);
    return compact_jwe;
}
