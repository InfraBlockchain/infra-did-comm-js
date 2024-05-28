import { VerifiableCredential, VerifiablePresentation } from "infra-did-js";
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
    VPReqRejectMessage,
    VPReqRejectResMessage,
    VPSubmitLaterMessage,
    VPSubmitLaterResMessage,
    VPSubmitMessage,
    VPSubmitResMessage,
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
import { sleep } from "../utils/functions";
import { InfraDIDCommAgent } from "./agent";
import {
    VCHoldingResult,
    VCRequirement,
    VCsMatchingResult,
    VPReqCallbackResponse,
} from "./types";

export async function messageHandler(
    jwe: string,
    mnemonic: string,
    did: string,
    agent: InfraDIDCommAgent,
    didAuthCallback?: (peerDID: string) => boolean,
    didConnectedCallback?: (peerDID: string) => void,
    didAuthFailedCallback?: (peerDID: string) => void,
    didVerifyCallback?: (peerDID: string) => boolean,
    VPSubmitDataCallback?: (
        vcRequirements: VCRequirement[],
        challenge: string,
    ) => VPReqCallbackResponse,
) {
    try {
        const header = extractJWEHeader(jwe);
        const alg = header["alg"];
        const x25519JwkPrivateKey = x25519JwkFromMnemonic(mnemonic);
        console.log("------------------------------------------------");

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

            sendDIDAuth(mnemonic, verifiedPayload, agent);
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
                didAuthCallback(fromDID);
                sendDIDConnectedFromDIDAuth(mnemonic, jwsPayload, agent);
            } else if (jwsPayload["type"] === "DIDConnected") {
                console.log("DIDConnected Message Received");
                didConnectedCallback(fromDID);
                agent.isDIDConnected = true;
                if (agent.role === "VERIFIER") {
                    sendDIDConnectedFromDIDConnected(
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
                console.log("VPReq Message Received");
                const vcRequirements: VCRequirement[] =
                    jwsPayload.body.VCRequirements;
                const challenge = jwsPayload.body.challenge;
                console.log("before VPSubmitDataCallback", vcRequirements);
                const vpReqCallbackResponse = VPSubmitDataCallback(
                    vcRequirements,
                    challenge,
                );

                const vcHoldingResult = vpReqCallbackResponse.status;

                if (vpReqCallbackResponse.status === VCHoldingResult.PREPARED) {
                    const signedVP = await createSignedVP(
                        agent,
                        vpReqCallbackResponse.requestedVCs,
                        challenge,
                    );
                    const stringSignedVP = JSON.stringify(signedVP.toJSON());
                    await sendVPSubmit(agent, stringSignedVP);
                } else if (vcHoldingResult === VCHoldingResult.LATER) {
                    await sendVPSubmitLater(agent);
                } else {
                    await sendVPReqReject(agent, "hate you");
                }
            } else if (jwsPayload["type"] === "VPSubmit") {
                console.log("VPSubmit Message Received", jwsPayload);
                await sendVPSubmitRes(mnemonic, jwsPayload, agent);
            } else if (jwsPayload["type"] === "VPSubmitRes") {
                console.log("VPSubmitRes Message Received", jwsPayload);
            } else if (jwsPayload["type"] === "VPReqReject") {
                console.log("VPReqReject Message Received", jwsPayload);
                await sendVPReqRejectRes(mnemonic, jwsPayload, agent);
            } else if (jwsPayload["type"] === "VPReqRejectRes") {
                console.log("VPReqRejectRes Message Received", jwsPayload);
            } else if (jwsPayload["type"] === "VPSubmitLater") {
                console.log("VPSubmitLater Message Received", jwsPayload);
                await sendVPSubmitLaterRes(agent);
            } else if (jwsPayload["type"] === "VPSubmitLaterRes") {
                console.log("VPSubmitLaterRes Message Received", jwsPayload);
                agent.disconnect();
            }
        }
    } catch (e) {
        Object.keys(agent.peerInfo).forEach(key => delete agent.peerInfo[key]);
        sendDIDAuthFailed(mnemonic, did, agent);
        agent.disconnect();
        throw new Error(`failed to handle the message: ${e}`);
    }
}

export async function sendDIDAuthInit(
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

export async function sendDIDAuth(
    mnemonic: string,
    didAuthInitMessagePayload: any,
    agent: InfraDIDCommAgent,
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
        const jwe = await createJWE(didAuthMessage, mnemonic, receiverDID);

        agent.socket.emit("message", {
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

export async function sendDIDConnectedFromDIDAuth(
    mnemonic: string,
    jwsPayload: Record<string, any>,
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        agent.isDIDVerified = true;
        agent.domain = jwsPayload.body.context.domain;
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = jwsPayload["from"];

        const didConnectedMessage = new DIDConnectedMessage(
            id,
            jwsPayload["to"][0],
            [receiverDID],
            currentTime,
            currentTime + 30000,
            jwsPayload["body"]["context"],
            "Successfully Connected",
        );
        const jwe = await createJWE(didConnectedMessage, mnemonic, receiverDID);

        agent.socket.emit("message", {
            to: jwsPayload["body"]["socketId"],
            m: jwe,
        });
        console.log(
            `DIDConnectedMessage sent to ${jwsPayload["body"]["socketId"]}`,
        );
    } catch (e) {
        console.log("failed to sendDIDConnectedMessageFromDIDAuthMessage", e);
    }
}

export async function sendDIDConnectedFromDIDConnected(
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

        const jwe = await createJWE(
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
        console.log("failed to send DIDConnectedFromDIDConnected", e);
    }
}

export async function sendDIDAuthFailed(
    mnemonic: string,
    did: string,
    agent: InfraDIDCommAgent,
    context?: any,
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

            const jwe = await createJWE(
                didAuthFailedMessage,
                mnemonic,
                receiverDID,
            );

            agent.socket.emit("message", { to: receiverSocketId, m: jwe });
            console.log(`DIDAuthFailedMessage sent to ${receiverSocketId}`);
        }
    } catch (e) {
        console.log("failed to send DIDAuthFailedMessage", e);
    }
}

export async function sendVPSubmit(
    agent: InfraDIDCommAgent,
    VP: string,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();

        const vpSubmitMessage = new VPSubmitMessage(
            id,
            agent.did,
            [agent.peerInfo.did],
            currentTime,
            currentTime + 30000,
            VP,
        );

        await sendJWE(agent, vpSubmitMessage);

        console.log(
            `VPSubmitMessage sent to ${agent.peerInfo.peerSocketId}, message: ${vpSubmitMessage}`,
        );
    } catch (error) {
        throw new Error(`Failed to send VPSubmit Message: ${error}`);
    }
}

export async function sendVPReqReject(
    agent: InfraDIDCommAgent,
    reason: string,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();

        const vpReqRejectMessage = new VPReqRejectMessage(
            id,
            agent.did,
            [agent.peerInfo.did],
            currentTime,
            currentTime + 30000,
            reason,
        );

        await sendJWE(agent, vpReqRejectMessage);
    } catch (error) {
        throw new Error(`Failed to sendVPReqRejectMessage: ${error}`);
    }
}

export async function sendVPSubmitLater(
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();

        const vpSubmitLaterMessage = new VPSubmitLaterMessage(
            id,
            agent.did,
            [agent.peerInfo.did],
            currentTime,
            currentTime + 30000,
        );

        await sendJWE(agent, vpSubmitLaterMessage);
    } catch (error) {
        throw new Error(`Failed to sendVPReqRejectMessage: ${error}`);
    }
}

export async function sendVPSubmitLaterRes(
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();

        const vpSubmitLaterResMessage = new VPSubmitLaterResMessage(
            id,
            agent.did,
            [agent.peerInfo.did],
            currentTime,
            currentTime + 30000,
            agent.verifierEndpoint,
        );

        await sendJWE(agent, vpSubmitLaterResMessage);

        // wait for the disconnection of the counterpart
        await sleep(3000);
        agent.disconnect();
    } catch (error) {
        throw new Error(`Failed to sendVPReqRejectMessage: ${error}`);
    }
}

export async function sendVPSubmitRes(
    mnemonic: string,
    jwsPayload: Record<string, any>,
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const VP = VerifiablePresentation.fromJSON(
            JSON.parse(jwsPayload.body.VP),
        );

        const verifyVPResult = await VP.verify(
            agent.infraApi,
            agent.infraApi.getChallenge(),
            agent.domain,
        );

        const verifiedVCRequirements = findMatchingVCRequirements(
            VP["credentials"],
            agent.VCRequirements,
        );
        console.log("verifiedVCRequirements", verifiedVCRequirements);

        if (!verifyVPResult.verified) {
            throw new Error(`failed to verify VP`);
        }

        if (!verifiedVCRequirements.result) {
            throw new Error(`failed to verify VCRequirements`);
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = agent.peerInfo["did"];
        const receiverSocketId = agent.peerInfo["socketId"];

        const vpSubmitResMessage = new VPSubmitResMessage(
            id,
            agent.did,
            [receiverDID],
            currentTime,
            currentTime + 30000,
            "Completed to verify the VP",
        );

        const jwe = await createJWE(vpSubmitResMessage, mnemonic, receiverDID);

        agent.socket.emit("message", { to: receiverSocketId, m: jwe });
        console.log(`VPSubmitResMessage sent to ${receiverSocketId}`);
    } catch (e) {
        console.log("failed to VPSubmitResMessage", e);
    }
}

export async function sendVPReqRejectRes(
    mnemonic: string,
    payload: Record<string, any>,
    agent: InfraDIDCommAgent,
): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();
        const receiverDID = agent.peerInfo["did"];
        const receiverSocketId = agent.peerInfo["socketId"];

        const vpSubmitResMessage = new VPReqRejectResMessage(
            id,
            agent.did,
            [receiverDID],
            currentTime,
            currentTime + 30000,
        );

        const jwe = await createJWE(vpSubmitResMessage, mnemonic, receiverDID);

        agent.socket.emit("message", { to: receiverSocketId, m: jwe });
        console.log(`VPReqRejectResMessage sent to ${receiverSocketId}`);
    } catch (e) {
        console.log("failed to VPReqRejectResMessage", e);
    }
}

export async function sendJWE(
    agent: InfraDIDCommAgent,
    message: Record<string, any>,
): Promise<void> {
    try {
        console.log("message[to]", message["to"]);
        const jwe = await createJWE(message, agent.mnemonic, message["to"][0]);

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

async function createJWE(
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
        console.log("failed to createJWE", e);
    }
}

async function createSignedVP(
    agent: InfraDIDCommAgent,
    RequestedVCs: VerifiableCredential[],
    vpReqChallenge: string,
): Promise<VerifiablePresentation> {
    const vp = new VerifiablePresentation(
        "http://university.example/credentials/5228473",
    );
    vp.addContext("https://www.w3.org/2018/credentials/examples/v1");
    vp.addContext("https://schema.org");
    vp.setHolder(agent.did);
    RequestedVCs.every(signedVC => {
        vp.addCredential(signedVC);
    });

    return vp.sign(agent.infraApi, vpReqChallenge, agent.domain);
}

export function findMatchingVCRequirements(
    VCs: VerifiableCredential[],
    vcRequirements: VCRequirement[],
): VCsMatchingResult {
    console.log("VCs", VCs);
    console.log("vcRequirements", vcRequirements);

    if (
        !VCs ||
        VCs.length === 0 ||
        !vcRequirements ||
        vcRequirements.length === 0
    ) {
        return { result: false };
    }
    console.log("Check");
    console.log("VCS", VCs);

    const matchingVCs = VCs.filter(VC => {
        const VCTypeList: string[] = VC["@context"] || VC["context"];
        const VCIssuer: string = VC["issuer"];
        console.log("VCTypeList", VCTypeList);
        console.log("VCIssuer", VCIssuer);

        return vcRequirements.some(
            vcRequirement =>
                VCTypeList.includes(vcRequirement.vcType) &&
                VCIssuer.includes(vcRequirement.issuer),
        );
    });
    console.log("matchingVCs", matchingVCs);

    const allRequirementsMet = vcRequirements.every(vcRequirement =>
        matchingVCs.some(VC => {
            const VCTypeList: string[] = VC["@context"] || VC["context"];
            const VCIssuer: string = VC["issuer"];
            console.log("VCTypeList", VCTypeList);
            console.log("VCIssuer", VCIssuer);

            return (
                VCTypeList.includes(vcRequirement.vcType) &&
                VCIssuer.includes(vcRequirement.issuer)
            );
        }),
    );

    if (allRequirementsMet) {
        return {
            result: true,
            matchingVCs: matchingVCs,
        };
    } else {
        return { result: false };
    }
}
