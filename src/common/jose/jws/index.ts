import * as jose from "jose";

export class JwsModule {
    constructor() {}
}

/**
 * This function is used to convert a payload and a private key into a JSON Web Signature (JWS).
 * It uses the jose library to create a new SignJWT object, sets the protected header with the type "JWM" and the algorithm "EdDSA",
 * and then signs the JWT with the private key. If an error occurs during the process, it is logged and re-thrown.
 * @param payload - The payload to be signed(JWM).
 * @param privateKey - The private key to be used for signing.
 * @returns The JSON Web Signature (JWS) of the payload.
 */

export async function toJWS(
    payload: Record<string, any>,
    privateKey: jose.KeyLike | Uint8Array,
) {
    try {
        const jws = await new jose.SignJWT(payload)
            .setProtectedHeader({ typ: "JWM", alg: "EdDSA" })
            .sign(privateKey);
        return jws;
    } catch (error) {
        console.error("Error creating JWS:", error);
        throw error;
    }
}
