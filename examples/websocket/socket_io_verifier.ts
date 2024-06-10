// socket_io_verifier.ts

import { sleep } from "../../src/utils/functions";
import {
    createAndEncodeRequestMessage,
    initializeAgent,
    vcRequirements,
} from "./common";

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

    while (!agent.isDIDConnected) {
        await sleep(500);
    }
    // 1st sendVPReq
    await agent.sendVPReq(vcRequirements);
    await sleep(4000);
    // 2nd sendVPReq
    await agent.sendVPReq(vcRequirements);
    await sleep(4000);
    // 3rd sendVPReq
    await agent.sendVPReq(vcRequirements);
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

async function main(): Promise<void> {
    await initiateConnectionByVerifier();
    // await receiveConnectionInitiatedByHolder();
}

main();
