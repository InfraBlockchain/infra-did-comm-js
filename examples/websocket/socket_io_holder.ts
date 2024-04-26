// socket_io_holder.ts
import {
    CompressionLevel,
    DIDConnectRequestMessage,
} from "../../src/messages/did-connect-request";
import { InfraDIDCommAgent } from "../../src/websocket";

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

/* eslint-disable @typescript-eslint/no-unused-vars */
async function initiateConnectionByHolder(): Promise<void> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "HOLDER",
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.init();

    const socketId = await agent.socketId;

    if (socketId) {
        const holderSocketId = socketId;
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
        console.log("Holder make encoded request message: " + encoded);
    } else {
        console.log("Socket ID is null");
    }
}

export async function receiveConnectionInitiatedByVerifier(): Promise<void> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "HOLDER",
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.init();
    const socketId = await agent.socketId;

    if (socketId) {
        const verifierSocketId = "x0rvaCKqZbbcYFWFACcj";
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
        console.log("Received encoded request message: " + encoded);
        await agent.sendDIDAuthInitMessage(encoded);
    } else {
        console.log("Socket ID is null");
    }
}

async function main() {
    // await initiateConnectionByHolder();
    await receiveConnectionInitiatedByVerifier();
}

main();
