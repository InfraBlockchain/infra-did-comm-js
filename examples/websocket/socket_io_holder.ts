// socket_io_holder.ts
import { VerifiableCredential } from "infra-did-js";
import { sleep } from "../../src/utils/functions";
import {
    InfraDIDCommAgent,
    VCHoldingResult,
    VCRequirement,
    VPReqCallbackResponse,
    findMatchingVCRequirements,
} from "../../src/websocket";
import {
    DID_CHAIN_ENDPOINT,
    createAndEncodeRequestMessage,
    didAuthCallback,
    didAuthFailedCallback,
    didConnectedCallback,
    holderDid,
    holderMnemonic,
    initializeAgent,
    vcRequirements,
} from "./common";

const verifierSocketId = "_TVb6c1uhp9unFgOAC91";
let isPermitted = true;
let mockVCRepository: VerifiableCredential[];

export function VPSubmitDataCallback(
    vcRequirements: VCRequirement[],
    challenge: string,
): VPReqCallbackResponse {
    const vcRepository = mockVCRepository;
    // allow all verifiers

    const vpReqResult = findMatchingVCRequirements(
        vcRepository,
        vcRequirements,
    );
    console.log("isVCRequirements", vpReqResult);

    console.log("VP Submit Data Callback, vcRequirements", vcRequirements);
    console.log("VP Submit Data Callback, challenge", challenge);

    if (isPermitted && vpReqResult.result) {
        return {
            status: VCHoldingResult.SUBMIT,
            requestedVCs: vpReqResult.matchingVCs,
        };
    } else {
        if (isPermitted) {
            return { status: VCHoldingResult.SUBMIT_LATER };
        } else {
            return { status: VCHoldingResult.REJECTED };
        }
    }
}

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

export async function mockVCsFromVCRequirements(
    vcRequirements: VCRequirement[],
): Promise<VerifiableCredential[]> {
    let VCs: VerifiableCredential[] = [];

    const mockAgent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        holderDid,
        holderMnemonic,
        "HOLDER",
        DID_CHAIN_ENDPOINT,
    );
    await mockAgent.init();

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
            await mockAgent.infraApi.didModule.getKeyDoc(),
        );
        VCs.push(signedVC);
    }

    return VCs;
}

async function receiveConnectionInitiatedByVerifier(): Promise<void> {
    mockVCRepository = await mockVCsFromVCRequirements(vcRequirements);

    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "HOLDER",
        DID_CHAIN_ENDPOINT,
    );

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);
    agent.setVPSubmitDataCallback(VPSubmitDataCallback);

    await agent.init();

    const socketId = await agent.socketId;

    if (socketId) {
        const encoded = await createAndEncodeRequestMessage(
            agent.did,
            verifierSocketId,
            "newnal",
        );

        // 1st: Send VP Submit & Receive VP Submit Res
        await agent.sendDIDAuthInitMessage(encoded);

        // 2nd: Send VP Req Reject
        await sleep(3000);
        isPermitted = false;

        // 3rd: SubmitLater due to not prepared VC requirements
        await sleep(3000);
        isPermitted = true;
        mockVCRepository = [];
    } else {
        console.log("Socket ID is null");
    }
}

async function main() {
    await receiveConnectionInitiatedByVerifier();
}

main();
