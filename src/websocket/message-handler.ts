import { VerifiablePresentation } from "infra-did-js";
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
import { jose } from "../jose-config";
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
    didVerifyCallback?: (peerDID: string) => boolean,
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
                await jose.exportJWK(sharedKey),
            );

            const payload = decodeJWS(jwsFromJwe);
            const fromDID = payload["from"];
            const fromAddress = fromDID.split(":").pop();
            const fromPublicKey = publicKeyFromAddress(fromAddress);
            const JWK = key2JWK("Ed25519", fromPublicKey);

            didVerifyCallback(fromDID);
            agent.isDIDVerified = true;

            const verifiedPayload = await verifyJWS(jwsFromJwe, JWK);
            agent.peerInfo = {
                did: verifiedPayload["from"],
                socketId: verifiedPayload["body"]["socketId"],
            };
            agent.isReceivedDIDAuthInit = true;

            sendDIDAuthMessage(mnemonic, verifiedPayload, agent.socket);
        } else if (alg === "dir") {
            if (!("did" in agent.peerInfo)) {
                throw new Error(
                    'The "did" property does not exist in agent.peerInfo',
                );
            }

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
                await jose.exportJWK(sharedKey),
            );

            const JWK = key2JWK("Ed25519", fromPublicKey);
            const jwsPayload = await verifyJWS(jwsFromJwe, JWK);

            if (jwsPayload["type"] === "DIDAuth") {
                console.log("DIDAuth Message Received");
                didVerifyCallback(fromDID);
                agent.isDIDVerified = true;
                // save domain
                agent.domain = jwsPayload.body.context.domain;
                didAuthCallback(fromDID);
                sendDIDConnectedMessageFromDIDAuthMessage(
                    mnemonic,
                    jwsPayload,
                    agent.socket,
                );
            } else if (jwsPayload["type"] === "DIDConnected") {
                console.log("DIDConnected Message Received");
                didConnectedCallback(fromDID);
                agent.isDIDConnected = true;
                if (agent.role === "VERIFIER") {
                    sendDIDConnectedMessageFromDIDConnectedMessage(
                        mnemonic,
                        jwsPayload,
                        agent,
                    );
                }
            } else if (jwsPayload["type"] === "DIDAuthFailed") {
                didAuthFailedCallback(fromDID);
                console.log("DIDAuthFailed Message Received");
                agent.disconnect();
            } else if (jwsPayload["type"] === "VPReq") {
                agent.VPReqChallenge = jwsPayload.body.challenge;
                // saveVPReqMessage(mnemonic, jwsPayload, agent);
                console.log("VPReq Message Received");
                // vpReqCallback(fromDID);
            } else if (jwsPayload["type"] === "VPSubmit") {
                // verifying jwsPayload;
                const VP = VerifiablePresentation.fromJSON(
                    JSON.parse(jwsPayload.body.VP),
                );

                const verifyVPResult = await VP.verify(
                    agent.infraApi,
                    agent.infraApi.getChallenge(),
                    agent.domain,
                );

                const verifiedVCRequirements = validateVCRequirement(
                    VP,
                    agent.VCs,
                );

                if (!verifyVPResult.verified) {
                    throw new Error(`failed to verify VP`);
                }

                if (!verifiedVCRequirements) {
                    throw new Error(`failed to verify VCRequirements`);
                }

                console.log("VPSubmit Message Received");
                // vpSubmitCallback(fromDID);
            } else if (jwsPayload["type"] === "VPSubmitRes") {
                console.log("VPSubmitRes Message Received");
                // vpSubmitResCallback(fromDID);
            } else if (jwsPayload["type"] === "VPReqReject") {
                console.log("VPReqReject Message Received");
                // vpReqRejectCallback(fromDID);
            } else if (jwsPayload["type"] === "VPReqRejectRes") {
                console.log("VPReqRejectRes Message Received");
                // vpReqRejectResCallback(fromDID);
            } else if (jwsPayload["type"] === "VPSubmitLater") {
                console.log("VPSubmitLater Message Received");
                // vpSubmitLaterCallback(fromDID);
            } else if (jwsPayload["type"] === "VPSubmitLaterRes") {
                console.log("VPSubmitLaterRes Message Received");
                // vpSubmitLaterResCallback(fromDID);
            }
        }
    } catch (e) {
        Object.keys(agent.peerInfo).forEach(key => delete agent.peerInfo[key]);
        sendDIDAuthFailedMessage(mnemonic, did, agent);
        agent.disconnect();
        throw new Error(`failed to handle the message: ${e}`);
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

        const jws = await compactJWS(payload, JWK, {
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
            await jose.exportJWK(sharedKey),
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

export async function sendJWE(
    mnemonic: string,
    message: any, // Assuming an appropriate interface/type for the payload
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const jwe = await createEncryptedJWE(
            message,
            mnemonic,
            message["to"][0],
        );

        agent.socket.emit("message", {
            to: agent.peerInfo["socketId"],
            m: jwe,
        });

        console.log(
            `${message["type"]} Message sent to ${agent.peerInfo["socketId"]}`,
        );
    } catch (e) {
        console.log("failed to sendVPSubmitMessage", e);
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

        const jws = await compactJWS(payload, JWK, {
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

function validateVCRequirement(
    signedVP: VerifiablePresentation,
    vcRequirements: VCRequirement[],
): boolean {
    const submittedVCs = signedVP["credentials"];
    console.log("submittedVCs", submittedVCs);

    // TODO: Add to validate "@context"

    return vcRequirements.every(vcRequirement => {
        return submittedVCs.some(vpVC => {
            const VCTypeList: string[] = vpVC["type"];
            const VCIssuer: string[] = vpVC["issuer"];
            return (
                VCTypeList.includes(vcRequirement.VCType) &&
                VCIssuer.includes(vcRequirement.issuer)
            );
        });
    });
}

export class VCRequirement {
    VCType: string;
    context: string;
    issuer: string;
}
