// socket_io_verifier.ts
import { CompressionLevel, DIDConnectRequestMessage } from "@src/messages";
import { InfraDIDCommAgent } from "@src/websocket";

import { receiveConnectionInitiatedByVerifier } from "./socket_io_holder";

function didAuthCallback(peerDID: string): boolean {
    console.log("DID Auth Callback", peerDID);
    return true;
}

function didConnectedCallback(peerDID: string): void {
    console.log("DID Connected Callback", peerDID);
}

function didAuthFailedCallback(peerDID: string): void {
    console.log("DID Auth Failed Callback", peerDID);
}

export async function receiveConnectionInitiatedByHolder(
    senderSocketId?: string,
): Promise<void> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "VERIFIER",
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.onMessage();
    agent.connect();

    const socketId = await agent.socketId;
    if (socketId) {
        const holderSocketId = senderSocketId;
        const minimalCompactJson = {
            from: did,
            body: {
                i: { sid: holderSocketId },
                c: { d: "pet-i.net", a: "connect" },
            },
        };
        const didConnectRequestMessage =
            DIDConnectRequestMessage.fromJSON(minimalCompactJson);

        const encoded = didConnectRequestMessage.encode(
            CompressionLevel.MINIMAL,
        );
        console.log("Received encoded request message from holder: " + encoded);
        await agent.sendDIDAuthInitMessage(encoded);
    } else {
        console.log("Socket ID is null");
    }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
async function initiateConnectionByVerifier(): Promise<string> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "VERIFIER",
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.onMessage();
    agent.connect();

    const socketId = await agent.socketId;
    if (socketId) {
        const verifierSocketId = socketId;
        const minimalCompactJson = {
            from: did,
            body: {
                i: { sid: verifierSocketId },
                c: { d: "pet-i.net", a: "connect" },
            },
        };
        const didConnectRequestMessage =
            DIDConnectRequestMessage.fromJSON(minimalCompactJson);
        const encoded = didConnectRequestMessage.encode(CompressionLevel.RAW);
        console.log("Verifier make encoded request message: " + encoded);
        return socketId;
    } else {
        console.log("Socket ID is null");
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
    const socketId = await initiateConnectionByVerifier();
    await sleep(1000);
    await receiveConnectionInitiatedByVerifier(socketId);
}

main();
