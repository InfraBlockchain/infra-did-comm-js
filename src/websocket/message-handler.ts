import { decryptJWE, encryptJWE, extractJWEHeader } from "@src/common/jwe";
import { decodeJWS, signJWS, verifyJWS } from "@src/common/jws";
import { DIDAuthInitMessage, DIDAuthMessage } from "@src/types/messages";
import {
    generateX25519EphemeralKeyPair,
    makeSharedKey,
    privateKeyfromX25519Jwk,
    publicKeyfromX25519Jwk,
    x25519JwkFromEd25519PublicKey,
} from "@src/utils/key";
import {
    privateKeyFromUri,
    publicKeyFromAddress,
} from "@src/utils/key_convert";
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
        const header = extractJWEHeader(jwe); // This function needs to be implemented or imported.
        const alg = header["alg"];
        if (alg === "ECDH-ES") {
            // Handle DIDAuthInit Message
            const epk = header["epk"];
            const privateKey = await privateKeyFromUri(mnemonic);
            const x25519JwkPrivateKey =
                await x25519JwkFromEd25519PrivateKey(privateKey);
            const sharedKey = await makeSharedKey(
                privateKeyfromX25519Jwk(x25519JwkPrivateKey),
                publicKeyfromX25519Jwk(epk),
            );
            const jwsFromJwe = await decryptJWE(
                jwe,
                jwkFromSharedKey(sharedKey),
            );
            const payload = decodeJWS(jwsFromJwe); // This function needs to be implemented or imported.
            const fromDID = payload["from"];
            const fromAddress = fromDID.split(":").pop();
            const fromPublicKey = publicKeyFromAddress(fromAddress);
            const jwsPayload = verifyJWS(
                jwsFromJwe,
                Buffer.from(fromPublicKey).toString("hex"),
            );
            client.peerInfo = {
                did: jwsPayload["from"],
                socketId: jwsPayload["body"]["socketId"],
            };
            client.isReceivedDIDAuthInit = true;
            // If Success, Send DID Auth Message
            sendDIDAuthMessage(mnemonic, jwsPayload, client.socket);
        } else if (alg === "dir") {
            // Handle DIDAuth && DIDConnected Message
            const privateKey = await privateKeyFromUri(mnemonic);
            const x25519JwkPrivateKey =
                await x25519JwkFromEd25519PrivateKey(privateKey);
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
                const jwsFromJwe = await decryptJWE(
                    jwe,
                    jwkFromSharedKey(sharedKey),
                );
                const jwsPayload = verifyJWS(
                    jwsFromJwe,
                    Buffer.from(fromPublicKey).toString("hex"),
                );
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
        client.peerInfo.clear();
        sendDIDAuthFailedMessage(mnemonic, did, client);
        client.socket.disconnect();
    }
}

export async function sendDIDAuthInitMessageToReceiver(
    message: DIDAuthInitMessage, // Assuming DIDAuthInitMessage type is defined
    mnemonic: string,
    receiverDID: string,
    client: InfraDIDCommSocketClient,
): Promise<string> {
    const jsonMessage = message;
    const stringMessage = JSON.stringify(jsonMessage);

    const extendedPrivateKey = await privateKeyFromUri(mnemonic);
    const receiverAddress = receiverDID.split(":").pop();
    const receiverPublicKey = publicKeyFromAddress(receiverAddress);
    client.peerInfo = {
        did: message.from,
        socketId: message.body.peerSocketId,
    };

    const jws = signJWS(
        stringMessage,
        Buffer.from(extendedPrivateKey).toString("hex"),
    ); // This may require an appropriate utility function

    const ephemeralKeyPair = await generateX25519EphemeralKeyPair();
    const ephemeralPrivateKey = ephemeralKeyPair[0];
    const ephemeralPublicKey = ephemeralKeyPair[1];

    const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);

    const sharedKey = await makeSharedKey(
        privateKeyfromX25519Jwk(ephemeralPrivateKey),
        publicKeyfromX25519Jwk(x25519JwkPublicKey),
    );

    const jwe = encryptJWE(
        jws,
        jwkFromSharedKey(sharedKey),
        { epk: x25519JwkFromX25519PublicKey(ephemeralPublicKey) }, // Assuming this is how the encryptJWE function is defined
    );

    return jwe;
}

export async function sendDIDAuthMessage(
    mnemonic: string,
    didAuthInitMessagePayload: any, // Assuming an appropriate interface/type for the payload
    socket: Socket,
): Promise<void> {
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

    const extendedPrivateKey = await privateKeyFromUri(mnemonic);
    const receiverPublicKey = publicKeyFromAddress(
        receiverDID.split(":").pop(),
    );

    // Additional cryptographic operations similar to the previous example
    // Sign and encrypt the message, then emit via socket
    const jws = signJWS(
        JSON.stringify(didAuthMessage.toJson()),
        Buffer.from(extendedPrivateKey).toString("hex"),
    );
    const sharedKey = await makeSharedKey(
        extendedPrivateKey,
        receiverPublicKey,
    );
    const jwe = encryptJWE(jws, jwkFromSharedKey(sharedKey));

    socket.emit("message", { to: didAuthMessage.peerSocketId, m: jwe });
    console.log(`DIDAuthMessage sent to ${didAuthMessage.peerSocketId}`);
}

export async function sendDIDConnectedMessageFromDIDAuthMessage(
    mnemonic: string,
    didAuthMessagePayload: any, // Assuming an appropriate interface/type for the payload
    socket: Socket,
): Promise<void> {
    const currentTime = Math.floor(Date.now() / 1000);
    const id = uuidv4();
    const receiverDID = didAuthMessagePayload["from"];

    // Assuming DIDConnectedMessage has a constructor or factory method from an object
    const didConnectedMessage = new DIDConnectedMessage({
        id: id,
        from: didAuthMessagePayload["to"][0],
        to: [receiverDID],
        createdTime: currentTime,
        expiresTime: currentTime + 30000,
        // Assume Context.fromJson() is replaced by direct object instantiation or another method
        context: didAuthMessagePayload["body"]["context"],
        status: "Successfully Connected",
    });

    // Similar cryptographic operations as in previous examples
    // Sign and encrypt the message, then emit via socket
    const jws = signJWS(
        JSON.stringify(didConnectedMessage.toJson()),
        Buffer.from(/* PrivateKey */).toString("hex"),
    );
    const sharedKey = await makeSharedKey(/* PrivateKey, ReceiverPublicKey */); // Placeholder
    const jwe = encryptJWE(jws, jwkFromSharedKey(sharedKey));

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

    const newDidConnectedMessage = new DIDConnectedMessage({
        id: id,
        from: didConnectedMessagePayload["to"][0],
        to: [receiverDID],
        createdTime: currentTime,
        expiresTime: currentTime + 30000,
        context: didConnectedMessagePayload["body"]["context"],
        status: "Successfully Connected",
    });

    // Similar cryptographic operations as in previous examples
    // Sign and encrypt the message, then emit via client's socket
    const jws = signJWS(
        JSON.stringify(newDidConnectedMessage.toJson()),
        Buffer.from(/* PrivateKey */).toString("hex"),
    );
    const sharedKey = await makeSharedKey(/* PrivateKey, ReceiverPublicKey */); // Placeholder
    const jwe = encryptJWE(jws, jwkFromSharedKey(sharedKey));

    client.socket.emit("message", { to: client.peerInfo["socketId"], m: jwe });
    console.log(`DIDConnectedMessage sent to ${client.peerInfo["socketId"]}`);
}

export async function sendDIDAuthFailedMessage(
    mnemonic: string,
    did: string,
    client: InfraDIDCommSocketClient,
    context?: any, // Assuming an appropriate interface/type for the context
): Promise<void> {
    const currentTime = Math.floor(Date.now() / 1000);
    const id = uuidv4();
    if (client.peerInfo.hasOwnProperty("did")) {
        const receiverDID = client.peerInfo["did"];
        const receiverSocketId = client.peerInfo["socketId"];

        const didAuthFailedMessage = new DIDAuthFailedMessage({
            id: id,
            from: did,
            to: [receiverDID],
            createdTime: currentTime,
            expiresTime: currentTime + 30000,
            context: context || { domain: "Infra DID Comm", action: "connect" },
            reason: "DID Auth Failed",
        });

        // Similar cryptographic operations as in previous examples
        // Sign and encrypt the message, then emit via client's socket
        const jws = signJWS(
            JSON.stringify(didAuthFailedMessage.toJson()),
            Buffer.from(/* PrivateKey */).toString("hex"),
        );
        const sharedKey =
            await makeSharedKey(/* PrivateKey, ReceiverPublicKey */); // Placeholder
        const jwe = encryptJWE(jws, jwkFromSharedKey(sharedKey));

        client.socket.emit("message", { to: receiverSocketId, m: jwe });
        console.log(`DIDAuthFailedMessage sent to ${receiverSocketId}`);
    }
}
