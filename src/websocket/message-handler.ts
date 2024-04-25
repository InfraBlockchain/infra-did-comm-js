import { KeyObject } from "crypto";
import { exportJWK, importJWK } from "jose";
import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

import {
    compactJWE,
    compactJWS,
    decodeJWS,
    decryptJWE,
    extractJWEHeader,
    verifyJWS,
} from "../crypto";
import {
    DIDAuthFailedMessage,
    DIDAuthInitMessage,
    DIDAuthMessage,
    DIDConnectedMessage,
} from "../messages";
import {
    deriveSharedKey,
    generateX25519EphemeralKeyPair,
    jwkFromSharedKey,
    key2JWK,
    privateKeyFromMnemonic,
    privateKeyfromX25519Jwk,
    publicKeyFromAddress,
    publicKeyFromMnemonic,
    publicKeyfromX25519Jwk,
    x25519JwkFromEd25519PublicKey,
    x25519JwkFromMnemonic,
    x25519JwkFromX25519PublicKey,
} from "../utils";
import { InfraDIDCommAgent } from "./agent";

export async function messageHandler(
    jwe: string,
    mnemonic: string,
    did: string,
    agent: InfraDIDCommAgent,
    didAuthCallback?: (peerDID: string) => boolean,
    didConnectedCallback?: (peerDID: string) => void,
    didAuthFailedCallback?: (peerDID: string) => void,
) {
    try {
        const header = extractJWEHeader(jwe);
        const alg = header["alg"];
        const x25519JwkPrivateKey = x25519JwkFromMnemonic(mnemonic);

        if (alg === "ECDH-ES") {
            if (!header["epk"]) {
                throw new Error("Invalid JWE Header: Missing 'epk' field.");
            }
            const epk = header["epk"];
            const sharedKey = deriveSharedKey(
                privateKeyfromX25519Jwk(x25519JwkPrivateKey),
                publicKeyfromX25519Jwk(epk),
            );
            const jwsFromJwe = await decryptJWE(
                jwe,
                await exportJWK(sharedKey),
            );

            const payload = decodeJWS(jwsFromJwe);
            const fromDID = payload["from"];
            const fromAddress = fromDID.split(":").pop();
            const fromPublicKey = publicKeyFromAddress(fromAddress);
            const JWK = key2JWK("Ed25519", fromPublicKey);
            const keyJWK = (await importJWK(JWK, "EdDSA")) as KeyObject;

            const verifiedPayload = await verifyJWS(jwsFromJwe, keyJWK);
            agent.peerInfo = {
                did: verifiedPayload["from"],
                socketId: verifiedPayload["body"]["socketId"],
            };
            agent.isReceivedDIDAuthInit = true;

            sendDIDAuthMessage(mnemonic, verifiedPayload, agent.socket);
        } else if (alg === "dir") {
            if ("did" in agent.peerInfo) {
                const fromDID = agent.peerInfo["did"];
                const fromAddress = fromDID.split(":").pop();
                const fromPublicKey = publicKeyFromAddress(fromAddress);
                const x25519JwkPublicKey =
                    x25519JwkFromEd25519PublicKey(fromPublicKey);

                const sharedKey = deriveSharedKey(
                    privateKeyfromX25519Jwk(x25519JwkPrivateKey),
                    publicKeyfromX25519Jwk(x25519JwkPublicKey),
                );

                const jwsFromJwe = await decryptJWE(
                    jwe,
                    await exportJWK(sharedKey),
                );

                const JWK = key2JWK("Ed25519", fromPublicKey);
                const keyJWK = (await importJWK(JWK, "EdDSA")) as KeyObject;
                const jwsPayload = await verifyJWS(jwsFromJwe, keyJWK);

                if (jwsPayload["type"] === "DIDAuth") {
                    console.log("DIDAuth Message Received");
                    didAuthCallback?.(fromDID);
                    sendDIDConnectedMessageFromDIDAuthMessage(
                        mnemonic,
                        jwsPayload,
                        agent.socket,
                    );
                } else if (jwsPayload["type"] === "DIDConnected") {
                    console.log("DIDConnected Message Received");
                    didConnectedCallback?.(fromDID);
                    agent.isDIDConnected = true;
                    if (agent.role === "VERIFIER") {
                        sendDIDConnectedMessageFromDIDConnectedMessage(
                            mnemonic,
                            jwsPayload,
                            agent,
                        );
                    }
                } else if (jwsPayload["type"] === "DIDAuthFailed") {
                    didAuthFailedCallback?.(fromDID);
                    console.log("DIDAuthFailed Message Received");
                    agent.disconnect();
                }
            }
        }
    } catch (e) {
        console.error("failed to handle the message: ", e);
        Object.keys(agent.peerInfo).forEach(key => delete agent.peerInfo[key]);
        sendDIDAuthFailedMessage(mnemonic, did, agent);
        agent.disconnect();
    }
}

export async function sendDIDAuthInitMessageToReceiver(
    message: DIDAuthInitMessage,
    mnemonic: string,
    receiverDID: string,
    agent: InfraDIDCommAgent,
): Promise<string> {
    try {
        const jsonMessage = message;
        const stringMessage = JSON.stringify(jsonMessage);
        const payload = new TextEncoder().encode(stringMessage);

        const publicKey = publicKeyFromMnemonic(mnemonic);
        const privateKey = privateKeyFromMnemonic(mnemonic);
        const JWK = key2JWK("Ed25519", publicKey, privateKey);
        const receiverPublicKey = publicKeyFromAddress(
            receiverDID.split(":").pop(),
        );
        agent.peerInfo = {
            did: message.from,
            socketId: message.body.peerSocketId,
        };

        const keyJWK = await importJWK(JWK, "EdDSA");
        const jws = await compactJWS(payload, keyJWK as KeyObject, {
            typ: "JWM",
            alg: "EdDSA",
        });

        const { ephemeralPrivateKey, ephemeralPublicKey } =
            generateX25519EphemeralKeyPair();
        const x25519JwkPublicKey =
            x25519JwkFromEd25519PublicKey(receiverPublicKey);
        const sharedKey = deriveSharedKey(
            ephemeralPrivateKey,
            publicKeyfromX25519Jwk(x25519JwkPublicKey),
        );

        const jwe = await compactJWE(
            jws,
            await exportJWK(sharedKey),
            x25519JwkFromX25519PublicKey(ephemeralPublicKey),
        );

        return jwe;
    } catch (e) {
        console.log("failed to sendDIDAuthInitMessageToReceiver", e);
    }
}

export async function sendDIDAuthMessage(
    mnemonic: string,
    didAuthInitMessagePayload: any,
    socket: Socket,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = didAuthInitMessagePayload["from"];

        const didAuthMessage = new DIDAuthMessage(
            id,
            didAuthInitMessagePayload["to"][0],
            [receiverDID],
            currentTime,
            currentTime + 30000,
            didAuthInitMessagePayload["body"]["context"],
            didAuthInitMessagePayload["body"]["peerSocketId"],
            didAuthInitMessagePayload["body"]["socketId"],
        );
        const jwe = await createEncryptedJWE(
            didAuthMessage,
            mnemonic,
            receiverDID,
        );

        socket.emit("message", {
            to: didAuthMessage.body.peerSocketId,
            m: jwe,
        });
        console.log(
            `DIDAuthMessage sent to ${didAuthMessage.body.peerSocketId}`,
        );
    } catch (e) {
        console.log("failed to sendDIDAuthMessage", e);
    }
}

export async function sendDIDConnectedMessageFromDIDAuthMessage(
    mnemonic: string,
    didAuthMessagePayload: any, // Assuming an appropriate interface/type for the payload
    socket: Socket,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = didAuthMessagePayload["from"];

        const didConnectedMessage = new DIDConnectedMessage(
            id,
            didAuthMessagePayload["to"][0],
            [receiverDID],
            currentTime,
            currentTime + 30000,
            didAuthMessagePayload["body"]["context"],
            "Successfully Connected",
        );
        const jwe = await createEncryptedJWE(
            didConnectedMessage,
            mnemonic,
            receiverDID,
        );

        socket.emit("message", {
            to: didAuthMessagePayload["body"]["socketId"],
            m: jwe,
        });
        console.log(
            `DIDConnectedMessage sent to ${didAuthMessagePayload["body"]["socketId"]}`,
        );
    } catch (e) {
        console.log("failed to sendDIDConnectedMessageFromDIDAuthMessage", e);
    }
}

export async function sendDIDConnectedMessageFromDIDConnectedMessage(
    mnemonic: string,
    didConnectedMessagePayload: any, // Assuming an appropriate interface/type for the payload
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = didConnectedMessagePayload["from"];

        const newDidConnectedMessage = new DIDConnectedMessage(
            id,
            didConnectedMessagePayload["to"][0],
            [receiverDID],
            currentTime,
            currentTime + 30000,
            didConnectedMessagePayload["body"]["context"],
            "Successfully Connected",
        );

        const jwe = await createEncryptedJWE(
            newDidConnectedMessage,
            mnemonic,
            receiverDID,
        );

        agent.socket.emit("message", {
            to: agent.peerInfo["socketId"],
            m: jwe,
        });
        console.log(
            `DIDConnectedMessage sent to ${agent.peerInfo["socketId"]}`,
        );
    } catch (e) {
        console.log(
            "failed to sendDIDConnectedMessageFromDIDConnectedMessage",
            e,
        );
    }
}

export async function sendDIDAuthFailedMessage(
    mnemonic: string,
    did: string,
    agent: InfraDIDCommAgent,
    context?: any, // Assumix`ng an appropriate interface/type for the context
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        if (agent.peerInfo.hasOwnProperty("did")) {
            const receiverDID = agent.peerInfo["did"];
            const receiverSocketId = agent.peerInfo["socketId"];

            const didAuthFailedMessage = new DIDAuthFailedMessage(
                id,
                did,
                [receiverDID],
                currentTime,
                currentTime + 30000,
                context || { domain: "Infra DID Comm", action: "connect" },
                "DID Auth Failed",
            );

            const jwe = await createEncryptedJWE(
                didAuthFailedMessage,
                mnemonic,
                receiverDID,
            );

            agent.socket.emit("message", { to: receiverSocketId, m: jwe });
            console.log(`DIDAuthFailedMessage sent to ${receiverSocketId}`);
        }
    } catch (e) {
        console.log("failed to sendDIDAuthFailedMessage", e);
    }
}

async function createEncryptedJWE(
    message: Record<string, any>,
    mnemonic: string,
    receiverDID: string,
): Promise<string> {
    try {
        const stringMessage = JSON.stringify(message);
        const payload = new TextEncoder().encode(stringMessage);

        const senderPrivateKey = privateKeyFromMnemonic(mnemonic);
        const senderPublicKey = publicKeyFromMnemonic(mnemonic);
        const receiverPublicKey = publicKeyFromAddress(
            receiverDID.split(":").pop(),
        );
        const x25519JwkPublicKey =
            x25519JwkFromEd25519PublicKey(receiverPublicKey);
        const JWK = key2JWK("Ed25519", senderPublicKey, senderPrivateKey);

        const keyJWK = await importJWK(JWK, "EdDSA");

        const jws = await compactJWS(payload, keyJWK as KeyObject, {
            typ: "JWM",
            alg: "EdDSA",
        });

        const senderPrivateKeyX25519JWK = x25519JwkFromMnemonic(mnemonic);
        const sharedKey = deriveSharedKey(
            privateKeyfromX25519Jwk(senderPrivateKeyX25519JWK),
            publicKeyfromX25519Jwk(x25519JwkPublicKey),
        );
        const jwe = await compactJWE(jws, jwkFromSharedKey(sharedKey));

        return jwe;
    } catch (e) {
        console.log("failed to createEncryptedJWE", e);
    }
}
