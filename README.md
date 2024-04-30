# infra-did-comm-js

Feature provided by infra-did-comm-js Library :

-   Make DID-Connect-Request Message
-   Make DID-Auth-Init Message
-   Make DID-Auth Message
-   Make DID-Connected Message
-   Make DID-Auth-Failed Message
-   Sign / Verify JWS
-   Encrypt / Decrypt JWE
-   Convert Key Ed25519 to X25519
-   Make shared key using ECDH-ES
-   Connect to Websocket Server
-   Make Dynamic QR Code

## Installation

```sh
yarn add infra-did-comm-js
```

## Examples

Get more examples in [examples](./examples) and [test](./test) folder.

### initCreatingDynamicConnectRequest

Dynamically generate a DID-Connect-Request Message and initiate a WebSocket connection

```javascript
function setQrDataCallback(peerDID: string): void {
    console.log("set QR Data Callback", peerDID);
}

function setDIDAuthCallback(peerDID: string): void {
    console.log("setDIDAuthCallback");
}

function setConnectedCallback(peerDID: string): void {
    setPeerDID(peerDID);
    console.log("peerDID", peerDID);
}

function setAuthFailedCallback(peerDID: string): void {
    console.log("setAuthFailedCallback");
}

const agent: websocket.InfraDIDCommAgent = new websocket.InfraDIDCommAgent(
    "https://ws-server.infrablockchain.net/",
    did,
    mnemonic,
    // The role can be either a holder or a verifier
    "HOLDER",
);

const context = new messages.Context("pet-i", "connect");
const timeoutSeconds = 30;

agent.setDIDConnectedCallback(setConnectedCallback);
agent.setDIDAuthCallback(setDIDAuthCallback);
agent.setDIDAuthFailedCallback(setAuthFailedCallback);
agent.initCreatingDynamicConnectRequest(context, timeoutSeconds, setQrDataCallback);

```

### initReceivingConnectRequest

Start a WebSocket connection upon receiving a DID-Connect-Request Message from a peer.

```javascript
function setDIDAuthCallback(peerDID: string): void {
    console.log("setDIDAuthCallback");
}

function setConnectedCallback(peerDID: string): void {
    setPeerDID(peerDID);
    console.log("peerDID", peerDID);
}

function setAuthFailedCallback(peerDID: string): void {
    console.log("setAuthFailedCallback");
}

const agent: websocket.InfraDIDCommAgent = new websocket.InfraDIDCommAgent(
    "https://ws-server.infrablockchain.net/",
    did,
    mnemonic,
    // The role can be either a holder or a verifier
    "HOLDER",
);

agent.setDIDConnectedCallback(setConnectedCallback);
agent.setDIDAuthCallback(setDIDAuthCallback);
agent.setDIDAuthFailedCallback(setAuthFailedCallback);
agent.initReceivingConnectRequest(encoded);
```
