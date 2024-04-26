import base64url from "base64url";

import { jose, joseOriginal } from "../index";

/**
 * Encrypts the given plaintext using the provided key and optional ephemeral public key.
 * @param plaintext - The plaintext to encrypt.
 * @param key - The key used for encryption.
 * @param epk - Optional ephemeral public key.
 * @returns The encrypted JWE string.
 */
export async function compactJWE(
    plaintext: string,
    key: Record<string, any>,
    epk?: Record<string, any>,
): Promise<string> {
    const keyLike = await jose.importJWK(key as joseOriginal.JWK);
    const plaintextU8A = new TextEncoder().encode(plaintext);

    if (epk != null) {
        const compactJWE = await new jose.CompactEncrypt(plaintextU8A)
            .setProtectedHeader({
                alg: "dir",
                enc: "A256GCM",
                epk,
            })
            .encrypt(keyLike);

        const splitCompactJWE = compactJWE.split(".");
        const protectedHeader = JSON.parse(
            base64url.decode(splitCompactJWE[0]),
        );
        protectedHeader["alg"] = "ECDH-ES";
        splitCompactJWE[0] = base64url.encode(JSON.stringify(protectedHeader));
        const aggregatedCompactJWE = splitCompactJWE.join(".");

        return aggregatedCompactJWE;
    } else {
        const compactJWE = await new jose.CompactEncrypt(Buffer.from(plaintext))
            .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
            .encrypt(keyLike);

        return compactJWE;
    }
}

/**
 * Decrypts the given JWE string using the provided key.
 * @param compactJWE - The JWE string to decrypt.
 * @param key - The key used for decryption.
 * @returns The decrypted plaintext.
 */
export async function decryptJWE(
    compactJWE: string,
    key: Record<string, any>,
): Promise<string> {
    try {
        const keyLike = await jose.importJWK(key);
        const splitCompactJWE = compactJWE.split(".");
        const protectedHeader = JSON.parse(
            base64url.decode(splitCompactJWE[0]),
        );

        protectedHeader["alg"] = "dir";
        splitCompactJWE[0] = base64url.encode(JSON.stringify(protectedHeader));
        const aggregatedCompactJWE = splitCompactJWE.join(".");

        const { plaintext } = await jose.compactDecrypt(
            aggregatedCompactJWE,
            keyLike,
        );

        return Buffer.from(plaintext).toString();
    } catch (error) {
        console.log("Error in decryptJWE: ", error);
    }
}

/**
 * Extracts the JWE header from the given JWE string.
 * @param jweCompact - The JWE string.
 * @returns The JWE header object.
 */
export function extractJWEHeader(jweCompact: string): object {
    try {
        return jose.decodeProtectedHeader(jweCompact);
    } catch (error) {
        // In case of not ECDH-ES, return the 'dir' header
        return { alg: "dir" };
    }
}
