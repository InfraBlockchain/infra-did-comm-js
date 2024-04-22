// socket_io_holder.ts
import {
    CompressionLevel,
    DIDConnectRequestMessage,
} from "../messages/did-connect-request";
import { InfraDIDCommSocketClient } from "../websocket";
import { receiveConnectionInitiatedByHolder } from "./socket_io_verifier";

export function didAuthInitCallback(peerDID: string): boolean {
    console.log("DID Auth Init Callback", peerDID);
    return true;
}

export function didAuthCallback(peerDID: string): boolean {
    console.log("DID Auth Callback", peerDID);
    return true;
}

export function didConnectedCallback(peerDID: string): void {
    console.log("DID Connected Callback", peerDID);
}

export function didAuthFailedCallback(peerDID: string): void {
    console.log("DID Auth Failed Callback", peerDID);
}

async function initiateConnectionByHolder(): Promise<string> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const client = new InfraDIDCommSocketClient(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "HOLDER",
    );

    client.setDIDAuthInitCallback(didAuthInitCallback);
    client.setDIDAuthCallback(didAuthCallback);
    client.setDIDConnectedCallback(didConnectedCallback);
    client.setDIDAuthFailedCallback(didAuthFailedCallback);

    client.onMessage();
    client.connect();

    const socketId = await client.socketId;

    console.log("socketId", socketId);
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
        const encoded = await didConnectRequestMessage.encode(
            CompressionLevel.MINIMAL,
        );
        console.log("Holder make encoded request message: " + encoded);
        return socketId;
    } else {
        console.log("Socket ID is null");
        return "";
    }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function receiveConnectionInitiatedByVerifier(
    socketId: string,
): Promise<string> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const client = new InfraDIDCommSocketClient(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "VERIFIER",
    );

    client.setDIDAuthInitCallback(didAuthInitCallback);
    client.setDIDAuthCallback(didAuthCallback);
    client.setDIDConnectedCallback(didConnectedCallback);
    client.setDIDAuthFailedCallback(didAuthFailedCallback);

    client.onMessage();
    client.connect();

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
        const encoded = await didConnectRequestMessage.encode(
            CompressionLevel.RAW,
        );
        console.log("Verifier make encoded request message: " + encoded);
        return socketId;
    } else {
        console.log("Socket ID is null");
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const socketId = await initiateConnectionByHolder();
    await sleep(1000);
    await receiveConnectionInitiatedByHolder(socketId);
}

main();
