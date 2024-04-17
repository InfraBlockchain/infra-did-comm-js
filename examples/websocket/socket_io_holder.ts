// socket_io_holder.ts
import {
    CompressionLevel,
    DIDConnectRequestMessage,
} from "@src/messages/did-connect-request";
import { InfraDIDCommSocketClient } from "@src/websocket";

import { initiatedByHolderScenarioVerifierClient } from "./socket_io_verifier";

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

async function initiatedByHolderScenario(): Promise<string> {
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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const socketId = await initiatedByHolderScenario();
    await sleep(1000);
    await initiatedByHolderScenarioVerifierClient(socketId);
}

main();
