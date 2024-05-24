// socket_io_verifier.ts
import { config as _config } from "dotenv";
import {
    createAndEncodeRequestMessage,
    initializeAgent,
    sleep,
    vcRequirements,
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

    while (!agent.isDIDConnected) {
        await sleep(500);
    }
    // 1st
    await agent.sendVPReq(vcRequirements);
    await sleep(4000);
    // 2nd
    await agent.sendVPReq(vcRequirements);
    await sleep(4000);
    // 3rd
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
