# infra-did-comm-js

This library provides a JavaScript implementation for secure, asynchronous, and bidirectional communication using Decentralized Identifiers (DIDs). It enables encrypted message transmission using DID-Shared-Secret-Keys, as well as requesting and verifying VP(Verifiable Presentation).

-   **Key Features**:
    -   Establish and manage DID connections.
    -   Secure message transmission.
    -   DID-Auth authentication.
    -   Sign / Verify JWS
    -   Encrypt / Decrypt JWE
    -   Request and Verify VP

Please refer to the following repository for detailed protocol documents: [infra-did-comm](https://github.com/InfraBlockchain/infrablockchain-improvement-proposals/blob/main/docs/infra-did-comm/v0.5/docs.md)

## Installation

```sh
yarn add infra-did-comm-js
```

## Examples

Get more examples in [examples](./examples) and [test](./test) folder.

### Verifier

Verifier initializes the agent and generates the DID Connect Request Message, which is delivered directly to the Holder without passing through the WebSocket. After establishing the DID connection, the Verifier requests the VP from the Holder.

```javascript
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
```

### Holder

Holder sets the VPSubmitDataCallback and then receives the DID Connect Request Message from the Verifier to connect via WebSocket. After establishing the DID connection, the Holder receives a VP request from the Verifier and responds according to the situation.

```javascript
function VPSubmitDataCallback(
    vcRequirements: VCRequirement[],
    challenge: string,
): VPReqCallbackResponse {
    const vcRepository = mockVCRepository;

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

let isPermitted = true;
let mockVCRepository = await mockVCsFromVCRequirements(vcRequirements);

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

    // 1st: Permitted Verifier, Set up mockVCRepository
    await agent.sendDIDAuthInitMessage(encoded);

    // 2nd: Not Permitted Verifier, Set up mockVCRepository
    await sleep(3000);
    isPermitted = false;

    // 3rd: Permitted Verifier, Not Set up mockVCRepository
    await sleep(3000);
    isPermitted = true;
    mockVCRepository = [];
} else {
    console.log("Socket ID is null");
}
```
