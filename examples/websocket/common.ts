// common.ts
import { VerifiableCredential } from "infra-did-js";
import { CompressionLevel, DIDConnectRequestMessage } from "../../src/messages";
import { InfraDIDCommAgent, VCRequirement } from "../../src/websocket";

export const verifierDID =
    "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
// "did:infra:space:15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5";

const issuerDID =
    "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";

export const holderMnemonic =
    "bamboo absorb chief dog box envelope leisure pink alone service spin more";
export const holderDid =
    "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";

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
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        verifierDID,
        mnemonic,
        role,
        process.env.DID_CHAIN_ENDPOINT,
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    await agent.init();

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

export async function mockVCsFromVCRequirements(
    agent: InfraDIDCommAgent,
    vcRequirements: VCRequirement[],
): Promise<VerifiableCredential[]> {
    let VCs: VerifiableCredential[] = [];

    for (const requirement of vcRequirements) {
        const vc = new VerifiableCredential(requirement.issuer);
        vc.addContext("https://www.w3.org/2018/credentials/v1");
        vc.addContext(requirement.vcType);
        vc.addType("VerifiableCredential");
        vc.addSubject({
            id: "did:example:abcdefg",
            degree: {
                type: "BachelorDegree",
                name: "Bachelor of Science and Arts",
            },
        });

        const signedVC = await vc.sign(
            await agent.infraApi.didModule.getKeyDoc(),
        );
        VCs.push(signedVC);
    }

    return VCs;
}

export const vcRequirements: VCRequirement[] = [
    {
        vcType: "https://schema.org",
        issuer: issuerDID,
    },
];
