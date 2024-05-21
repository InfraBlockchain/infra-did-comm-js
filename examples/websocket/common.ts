// common.ts
import { CompressionLevel, DIDConnectRequestMessage } from "../../src/messages";
import { InfraDIDCommAgent } from "../../src/websocket";

// Utility Functions
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

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Agent Initialization
export async function initializeAgent(
    role: string,
): Promise<InfraDIDCommAgent> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        role,
        process.env.DID_CHAIN_ENDPOINT,
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.init();
    return agent;
}

// Create and Encode Request Message
export async function createAndEncodeRequestMessage(
    did: string,
    socketId: string,
    domain: string,
): Promise<string> {
    const minimalCompactJson = {
        from: did,
        body: {
            i: { sid: socketId },
            c: { d: domain, a: "connect" },
        },
    };
    const didConnectRequestMessage =
        DIDConnectRequestMessage.fromJSON(minimalCompactJson);
    return didConnectRequestMessage.encode(CompressionLevel.MINIMAL);
}
