import { decryptJWE, encryptJWE, extractJWEHeader } from "@src/crypto/jwe";
import { compactJws, decodeJWS, verifyJWS } from "@src/crypto/jws";
import {
    DIDAuthFailedMessage,
    DIDAuthInitMessage,
    DIDAuthMessage,
    DIDConnectedMessage,
} from "@src/types/messages";
import {
    generateX25519EphemeralKeyPair,
    jwkFromSharedKey,
    makeSharedKey,
    privateKeyfromX25519Jwk,
    publicKeyfromX25519Jwk,
    x25519JwkFromEd25519PublicKey,
    x25519JwkFromMnemonic,
    x25519JwkFromX25519PublicKey,
} from "@src/utils/key";
import {
    privateKeyFromUri,
    publicKeyFromAddress,
    publicKeyFromUri,
} from "@src/utils/key_convert";
import { CryptoHelper } from "infra-did-js";
import { exportJWK } from "jose";
import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

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
        console.log("jwe", jwe);
        const header = extractJWEHeader(jwe); // This function needs to be implemented or imported.
        console.log("header", header);
        const alg = header["alg"];
        if (alg === "ECDH-ES") {
            const epk = header["epk"];
            const x25519JwkPrivateKey = x25519JwkFromMnemonic(mnemonic);
            const sharedKey = await makeSharedKey(
                privateKeyfromX25519Jwk(x25519JwkPrivateKey),
                publicKeyfromX25519Jwk(epk),
            );

            const jwsFromJwe = await decryptJWE(
                jwe,
                await exportJWK(sharedKey),
            );
            const payload = decodeJWS(jwsFromJwe); // This function needs to be implemented or imported.
            const fromDID = payload["from"];
            const fromAddress = fromDID.split(":").pop();
            const fromPublicKey = publicKeyFromAddress(fromAddress);

            const JWK = CryptoHelper.key2JWK("Ed25519", fromPublicKey);
            const objectJWK = CryptoHelper.jwk2KeyObject(JWK, "public");

            const jwsPayload = await verifyJWS(jwsFromJwe, objectJWK);
            client.peerInfo = {
                did: jwsPayload["from"],
                socketId: jwsPayload["body"]["socketId"],
            };
            client.isReceivedDIDAuthInit = true;
            // If Success, Send DID Auth Message
            sendDIDAuthMessage(mnemonic, jwsPayload, client.socket);
        } else if (alg === "dir") {
            // Handle DIDAuth && DIDConnected Message
            const x25519JwkPrivateKey = x25519JwkFromMnemonic(mnemonic);
            if ("did" in client.peerInfo) {
                const fromDID = client.peerInfo["did"];
                const fromAddress = fromDID.split(":").pop();
                const fromPublicKey = publicKeyFromAddress(fromAddress);
                const x25519JwkPublicKey =
                    x25519JwkFromEd25519PublicKey(fromPublicKey);

                const sharedKey = await makeSharedKey(
                    privateKeyfromX25519Jwk(x25519JwkPrivateKey),
                    publicKeyfromX25519Jwk(x25519JwkPublicKey),
                );

                console.log("dir alg jwe", jwe);
                const jwsFromJwe = await decryptJWE(
                    jwe,
                    await exportJWK(sharedKey),
                );

                const JWK = CryptoHelper.key2JWK("Ed25519", fromPublicKey);
                const objectJWK = CryptoHelper.jwk2KeyObject(JWK, "public");

                const jwsPayload = await verifyJWS(jwsFromJwe, objectJWK);
                console.log("MSG HANDLER jwsPayload", jwsPayload);
                if (jwsPayload["type"] === "DIDAuth") {
                    // If Success, Send DID Connected Message
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
        client.socket.disconnect();
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

    // why use both public key and private key?
    const publicKey = publicKeyFromUri(mnemonic);
    const privateKey = privateKeyFromUri(mnemonic);
    const JWK = CryptoHelper.key2JWK("Ed25519", publicKey, privateKey);
    const receiverPublicKey = publicKeyFromAddress(
        receiverDID.split(":").pop(),
    );
    client.peerInfo = {
        did: message.from,
        socketId: message.body.peerSocketId,
    };

    const jws = await compactJws(
        payload,
        CryptoHelper.jwk2KeyObject(JWK, "private"),
        {
            typ: "JWM",
            alg: "EdDSA",
        },
    );

    const ephemeralKeyPair = await generateX25519EphemeralKeyPair();
    const ephemeralPrivateKey = ephemeralKeyPair[0];
    const ephemeralPublicKey = ephemeralKeyPair[1];

    const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);

    const sharedKey = await makeSharedKey(
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
    didAuthInitMessagePayload: any, // Assuming an appropriate interface/type for the payload
    socket: Socket,
): Promise<void> {
    console.log("here didAuthInitMessagePayload", didAuthInitMessagePayload);
    const currentTime = Math.floor(Date.now() / 1000);
    const id = uuidv4();
    const receiverDID = didAuthInitMessagePayload["from"];

    // Assuming DIDAuthMessage has a constructor or factory method from an object
    const didAuthMessage = new DIDAuthMessage(
        id,
        didAuthInitMessagePayload["to"][0],
        [receiverDID],
        currentTime,
        currentTime + 30000,
        // Assume Context.fromJson() is replaced by direct object instantiation or another method
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

    const senderPrivateKey = privateKeyFromUri(mnemonic);
    const senderPublicKey = publicKeyFromUri(mnemonic);

    const receiverPublicKey = publicKeyFromAddress(
        receiverDID.split(":").pop(),
    );
    const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);

    const JWK = CryptoHelper.key2JWK(
        "Ed25519",
        senderPublicKey,
        senderPrivateKey,
    );

    const jws = await compactJws(
        payload,
        CryptoHelper.jwk2KeyObject(JWK, "private"),
        {
            typ: "JWM",
            alg: "EdDSA",
        },
    );

    const senderPrivateKeyX25519JWK = x25519JwkFromMnemonic(mnemonic);

    const sharedKey = await makeSharedKey(
        privateKeyfromX25519Jwk(senderPrivateKeyX25519JWK),
        publicKeyfromX25519Jwk(x25519JwkPublicKey),
    );
    const jwe = await encryptJWE(jws, jwkFromSharedKey(sharedKey));

    return jwe;
}
