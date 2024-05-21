// socket_io_holder.ts
import { config as _config } from "dotenv";
import { VerifiableCredential, VerifiablePresentation } from "infra-did-js";
import { InfraDIDCommAgent } from "../../src/websocket";
import {
    createAndEncodeRequestMessage,
    initializeAgent,
    sleep,
} from "./common";

_config({ path: __dirname + "/../../.env" });
const verifierSocketId = "lFjFwwmORC0vjPmRACsd";

async function initiateConnectionByHolder(): Promise<void> {
    const agent = await initializeAgent("HOLDER");
    const socketId = await agent.socketId;

    if (socketId) {
        const encoded = await createAndEncodeRequestMessage(
            agent.did,
            socketId,
            "pet-i.net",
        );
        console.log("Holder make encoded request message: " + encoded);
    } else {
        console.log("Socket ID is null");
    }
}

async function receiveConnectionInitiatedByVerifier(): Promise<void> {
    const agent = await initializeAgent("HOLDER");
    const socketId = await agent.socketId;

    if (socketId) {
        const encoded = await createAndEncodeRequestMessage(
            agent.did,
            verifierSocketId,
            "newnal",
        );
        console.log("Received encoded request message: " + encoded);

        await agent.sendDIDAuthInitMessage(encoded);

        await handleVPSubmission(agent);
    } else {
        console.log("Socket ID is null");
    }
}

async function handleVPSubmission(agent: InfraDIDCommAgent): Promise<void> {
    while (true) {
        await sleep(1000);
        if (agent.VPReqChallenge !== "") {
            console.log("1");

            const signedVC = await createSignedVC(agent);

            const signedVP = await createSignedVP(agent, signedVC);

            const stringSignedVP = JSON.stringify(signedVP.toJSON());
            await agent.sendVPSubmit(stringSignedVP);
            break;
        }
    }
}

async function createSignedVC(
    agent: InfraDIDCommAgent,
): Promise<VerifiableCredential> {
    const vc = new VerifiableCredential(
        "did:infra:space:15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5",
    );
    vc.addContext("https://www.w3.org/2018/credentials/v1");
    vc.addContext("https://schema.org");
    vc.addType("VerifiableCredential");
    vc.addType("UniversityDegreeCredential");
    vc.addSubject({
        id: "did:example:abcdefg",
        degree: {
            type: "BachelorDegree",
            name: "Bachelor of Science and Arts",
        },
    });

    return vc.sign(await agent.infraApi.didModule.getKeyDoc());
}

async function createSignedVP(
    agent: InfraDIDCommAgent,
    signedVC: VerifiableCredential,
): Promise<VerifiablePresentation> {
    const vp = new VerifiablePresentation(
        "http://university.example/credentials/58473",
    );
    vp.addContext("https://www.w3.org/2018/credentials/examples/v1");
    vp.addContext("https://schema.org");
    vp.setHolder(agent.did);
    vp.addCredential(signedVC);

    console.log("agent.VPReqChallenge", agent.VPReqChallenge);

    return vp.sign(agent.infraApi, agent.VPReqChallenge, "newnal");
}

// 6. Execution Code
async function main() {
    await receiveConnectionInitiatedByVerifier();
}

main();

// TODO: use heldVCs to submit corresponding VCRequirements from verifier
// class Holder {
//     private heldVCs: any[]; // Holder가 보유한 VC 리스트

//     constructor(heldVCs: any[]) {
//         this.heldVCs = heldVCs;
//     }

//     findMatchingVCs(requestedVCs: VCRequest[]): boolean {
//         return requestedVCs.every(requestedVC => {
//             return this.heldVCs.some(heldVC => {
//                 return heldVC.type.includes(requestedVC.VCType) &&
//                     heldVC['@context'].includes(requestedVC.context);
//             });
//         });
//     }
// }
