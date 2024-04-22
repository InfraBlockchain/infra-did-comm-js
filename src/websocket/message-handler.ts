import { CryptoHelper } from "infra-did-js";
import { exportJWK } from "jose";
import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

import {
    compactJWS,
    decodeJWS,
    decryptJWE,
    encryptJWE,
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
    privateKeyFromMnemonic,
    privateKeyfromX25519Jwk,
    publicKeyFromAddress,
    publicKeyFromMnemonic,
    publicKeyfromX25519Jwk,
    x25519JwkFromEd25519PublicKey,
    x25519JwkFromMnemonic,
    x25519JwkFromX25519PublicKey,
} from "../utils";
import { InfraDIDCommSocketClient } from "./ws-client-connect";

export async function messageHandler(
    jwe: string,
    mnemonic: string,
    did: string,
    client: InfraDIDCommSocketClient,
    didAuthInitCallback?: (peerDID: string) => boolean,
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
            const JWK = CryptoHelper.key2JWK("Ed25519", fromPublicKey);
            const objectJWK = CryptoHelper.jwk2KeyObject(JWK, "public");

            const verifiedPayload = await verifyJWS(jwsFromJwe, objectJWK);
            client.peerInfo = {
                did: verifiedPayload["from"],
                socketId: verifiedPayload["body"]["socketId"],
            };
            client.isReceivedDIDAuthInit = true;

            sendDIDAuthMessage(mnemonic, verifiedPayload, client.socket);
        } else if (alg === "dir") {
            if ("did" in client.peerInfo) {
                const fromDID = client.peerInfo["did"];
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

                const JWK = CryptoHelper.key2JWK("Ed25519", fromPublicKey);
                const keyObject = CryptoHelper.jwk2KeyObject(JWK, "public");
                const jwsPayload = await verifyJWS(jwsFromJwe, keyObject);

                if (jwsPayload["type"] === "DIDAuth") {
                    console.log("DIDAuth Message Received");
                    sendDIDConnectedMessageFromDIDAuthMessage(
                        mnemonic,
                        jwsPayload,
                        client.socket,
                    );
                } else if (jwsPayload["type"] === "DIDConnected") {
                    console.log("DIDConnected Message Received");
                    didConnectedCallback?.(fromDID);
                    client.isDIDConnected = true;
                    if (client.role === "VERIFIER") {
                        sendDIDConnectedMessageFromDIDConnectedMessage(
                            mnemonic,
                            jwsPayload,
                            client,
                        );
                    }
                } else if (jwsPayload["type"] === "DIDAuthFailed") {
                    didAuthFailedCallback?.(fromDID);
                    console.log("DIDAuthFailed Message Received");
                    client.disconnect();
                }
            }
        }
    } catch (e) {
        Object.keys(client.peerInfo).forEach(
            key => delete client.peerInfo[key],
        );
        sendDIDAuthFailedMessage(mnemonic, did, client);
        client.disconnect();
    }
}

export async function sendDIDAuthInitMessageToReceiver(
    message: DIDAuthInitMessage,
    mnemonic: string,
    receiverDID: string,
    client: InfraDIDCommSocketClient,
): Promise<string> {
    const jsonMessage = message;
    const stringMessage = JSON.stringify(jsonMessage);
    const payload = new TextEncoder().encode(stringMessage);

    const publicKey = publicKeyFromMnemonic(mnemonic);
    const privateKey = privateKeyFromMnemonic(mnemonic);
    const JWK = CryptoHelper.key2JWK("Ed25519", publicKey, privateKey);
    const receiverPublicKey = publicKeyFromAddress(
        receiverDID.split(":").pop(),
    );
    client.peerInfo = {
        did: message.from,
        socketId: message.body.peerSocketId,
    };

    const jws = await compactJWS(
        payload,
        CryptoHelper.jwk2KeyObject(JWK, "private"),
        {
            typ: "JWM",
            alg: "EdDSA",
        },
    );

    const { ephemeralPrivateKey, ephemeralPublicKey } =
        generateX25519EphemeralKeyPair();
    const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);
    const sharedKey = deriveSharedKey(
        ephemeralPrivateKey,
        publicKeyfromX25519Jwk(x25519JwkPublicKey),
    );

    const jwe = await encryptJWE(
        jws,
        await exportJWK(sharedKey),
        x25519JwkFromX25519PublicKey(ephemeralPublicKey),
    );

    return jwe;
}

export async function sendDIDAuthMessage(
    mnemonic: string,
    didAuthInitMessagePayload: any,
    socket: Socket,
): Promise<void> {
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
    const jwe = await createEncryptedJWE(didAuthMessage, mnemonic, receiverDID);

    socket.emit("message", { to: didAuthMessage.body.peerSocketId, m: jwe });
    console.log(`DIDAuthMessage sent to ${didAuthMessage.body.peerSocketId}`);
}

export async function sendDIDConnectedMessageFromDIDAuthMessage(
    mnemonic: string,
    didAuthMessagePayload: any, // Assuming an appropriate interface/type for the payload
    socket: Socket,
): Promise<void> {
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
}

export async function sendDIDConnectedMessageFromDIDConnectedMessage(
    mnemonic: string,
    didConnectedMessagePayload: any, // Assuming an appropriate interface/type for the payload
    client: InfraDIDCommSocketClient,
): Promise<void> {
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

    client.socket.emit("message", { to: client.peerInfo["socketId"], m: jwe });
    console.log(`DIDConnectedMessage sent to ${client.peerInfo["socketId"]}`);
}

export async function sendDIDAuthFailedMessage(
    mnemonic: string,
    did: string,
    client: InfraDIDCommSocketClient,
    context?: any, // Assumix`ng an appropriate interface/type for the context
): Promise<void> {
    const currentTime = Math.floor(Date.now() / 1000);
    const id = uuidv4();
    if (client.peerInfo.hasOwnProperty("did")) {
        const receiverDID = client.peerInfo["did"];
        const receiverSocketId = client.peerInfo["socketId"];

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

        client.socket.emit("message", { to: receiverSocketId, m: jwe });
        console.log(`DIDAuthFailedMessage sent to ${receiverSocketId}`);
    }
}

async function createEncryptedJWE(
    message: Record<string, any>,
    mnemonic: string,
    receiverDID: string,
): Promise<string> {
    const stringMessage = JSON.stringify(message);
    const payload = new TextEncoder().encode(stringMessage);

    const senderPrivateKey = privateKeyFromMnemonic(mnemonic);
    const senderPublicKey = publicKeyFromMnemonic(mnemonic);
    const receiverPublicKey = publicKeyFromAddress(
        receiverDID.split(":").pop(),
    );
    const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);
    const JWK = CryptoHelper.key2JWK(
        "Ed25519",
        senderPublicKey,
        senderPrivateKey,
    );

    const jws = await compactJWS(
        payload,
        CryptoHelper.jwk2KeyObject(JWK, "private"),
        {
            typ: "JWM",
            alg: "EdDSA",
        },
    );

    const senderPrivateKeyX25519JWK = x25519JwkFromMnemonic(mnemonic);
    const sharedKey = deriveSharedKey(
        privateKeyfromX25519Jwk(senderPrivateKeyX25519JWK),
        publicKeyfromX25519Jwk(x25519JwkPublicKey),
    );
    const jwe = await encryptJWE(jws, jwkFromSharedKey(sharedKey));

    return jwe;
}
