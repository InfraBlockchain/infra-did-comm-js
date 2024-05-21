// socket_io_verifier.ts
import { config as _config } from "dotenv";
import { VCRequirement } from "../../src/websocket";
import {
    createAndEncodeRequestMessage,
    initializeAgent,
    sleep,
} from "./common";

_config({ path: __dirname + "/../../.env" });

async function initiateConnectionByVerifier(): Promise<void> {
    const agent = await initializeAgent("VERIFIER");
    const socketId = await agent.socketId;
    const domain = "newnal";

    if (socketId) {
        const encoded = await createAndEncodeRequestMessage(
            agent.did,
            socketId,
            domain,
        );
        console.log("Verifier make encoded request message: " + encoded);
    } else {
        console.log("Socket ID is null");
        return;
    }

    const requestedVCs: VCRequirement[] = [
        {
            VCType: "UniversityDegreeCredential",
            context: "https://example.org/contexts/university-degree-v1.jsonld",
            issuer: agent.did,
        },
    ];

    while (!agent.isDIDConnected) {
        await sleep(1000);
    }

    console.log("before sendVPReq");
    await agent.sendVPReq(requestedVCs);
    console.log("after sendVPReq");
}

export async function receiveConnectionInitiatedByHolder(): Promise<void> {
    const agent = await initializeAgent("VERIFIER");
    const socketId = await agent.socketId;

    if (socketId) {
        const holderSocketId = "bLZ_IoVxKuZM3XO5AAqh";
        const encoded = await createAndEncodeRequestMessage(
            agent.did,
            holderSocketId,
            "pet-i.net",
        );
        console.log("Received encoded request message from holder: " + encoded);
        await agent.sendDIDAuthInitMessage(encoded);
    } else {
        console.log("Socket ID is null");
    }
}

// 5. Execution Code
async function main(): Promise<void> {
    await initiateConnectionByVerifier();
    // await receiveConnectionInitiatedByHolder();
}

main();
