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
yarn add infra-did-comm-js # currently not work cause this library is not published yet in the npm
yarn add https://github.com/InfraBlockchain/infra-did-comm-js.git # add with git url now
```

## Examples

Get more examples in [examples](./examples) and [test](./test) folder.

### Make DID-Connect-Request Message

There are three methods to create DID-Connect-Request Message

```javascript
const socketId: string = socketId;

// 1) didConnectRequestMessage from json
const json = {
    from: did,
    body: {
        initiator: {
            serviceEndpoint: "https://example.com/endpoint",
            socketId: socketId
        },
        context: {
            domain: "pet-i.net",
            action: "connect"
        },
    },
};
const didConnectRequestMessage =
    DIDConnectRequestMessage.fromJSON(json);

// 2) didConnectRequestMessage from compactJSON
const compactJson = {
    from: did,
    body: {
        i: {
            se: "https://example.com/endpoint",
            sid: socketId
        },
        c: {
            d: "pet-i.net",
            a: "connect"
        },
    },
};
const didConnectRequestMessageFromCompact =
    DIDConnectRequestMessage.fromJSON(compactJson);

// 3) didConnectRequestMessage from minimalCompactJSON
const minimalCompactJson = {
    from: did,
    body: {
        i: { sid: socketId },
        c: { d: "pet-i.net", a: "connect" },
    },
};
const didConnectRequestMessageFromMinimalCompact =
    DIDConnectRequestMessage.fromJSON(minimalCompactJson);
```

### Make DID-Auth-Init Message

```javascript
const currentTime = Math.floor(Date.now() / 1000);
const id = uuidv4();

const receiverDID = didConnectRequestMessage.from;
const peerSocketId = didConnectRequestMessage.body.initiator.socketId;

const didAuthInitMessage = new DIDAuthInitMessage(
    id,
    this.did,
    [receiverDID],
    currentTime,
    currentTime + 30000,
    didConnectRequestMessage.body.context,
    this.socket.id,
    peerSocketId,
);
```

### Make DID-Auth Message

```javascript
const currentTime = Math.floor(Date.now() / 1000);
const id = uuidv4();
const receiverDID = didAuthInitMessagePayload["from"];

const didAuthMessage = new DIDAuthMessage(
    id,
    didAuthInitMessagePayload["to"][0],
    [receiverDID],
    currentTime,
    currentTime + 30000,
    didAuthInitMessagePayload["body"]["context"],
    didAuthInitMessagePayload["body"]["peerSocketId"],
    didAuthInitMessagePayload["body"]["socketId"],
);
```

### Make DID-Connected Message

```javascript
const currentTime = Math.floor(Date.now() / 1000);
const id = uuidv4();
const receiverDID = didAuthMessagePayload["from"];

const didConnectedMessage = new DIDConnectedMessage(
    id,
    didAuthMessagePayload["to"][0],
    [receiverDID],
    currentTime,
    currentTime + 30000,
    didAuthMessagePayload["body"]["context"],
    "Successfully Connected",
);
```

### Make DID-Auth-Failed Message

```javascript
const currentTime = Math.floor(Date.now() / 1000);
const id = uuidv4();
const receiverDID = agent.peerInfo["did"];
const receiverSocketId = agent.peerInfo["socketId"];

const didAuthFailedMessage = new DIDAuthFailedMessage(
    id,
    did,
    [receiverDID],
    currentTime,
    currentTime + 30000,
    context || { domain: "Infra DID Comm", action: "connect" },
    "DID Auth Failed",
);
```

### Sign / Verify JWS

```javascript
const privateKey = privateKeyFromMnemonic(mnemonic);
const publicKey = publicKeyFromMnemonic(mnemonic);
const JWK = key2JWK("Ed25519", publicKey, privateKey);

const jws = await compactJWS(payload, JWK, {
    typ: "JWM",
    alg: "EdDSA",
});

var payload = verifyJWS(jws, publicKey);
```

### Encrypt / Decrypt JWE

-   With epk

```javascript
const { ephemeralPrivateKey, ephemeralPublicKey } =
    generateX25519EphemeralKeyPair();
const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(receiverPublicKey);
const sharedKey = deriveSharedKey(
    ephemeralPrivateKey,
    publicKeyfromX25519Jwk(x25519JwkPublicKey),
);

const jwe = await compactJWE(
    payload,
    await jose.exportJWK(sharedKey),
    x25519JwkFromX25519PublicKey(ephemeralPublicKey),
);
```

-   Without epk

```javascript
const x25519JwkPublicKey = x25519JwkFromEd25519PublicKey(publicKey);
const senderPrivateKeyX25519JWK = x25519JwkFromMnemonic(mnemonic);
const sharedKey = deriveSharedKey(
    privateKeyfromX25519Jwk(senderPrivateKeyX25519JWK),
    publicKeyfromX25519Jwk(x25519JwkPublicKey),
);
const jwe = await compactJWE(payload, jwkFromSharedKey(sharedKey));
```

### Convert Key Ed25519 to X25519

```javascript
const bobSeed =
    "bamboo absorb chief dog box envelope leisure pink alone service spin more";
const bobPublicKeyED25519 = publicKeyFromMnemonic(bobSeed);
const bobX25519JwkPublicKey =
    x25519JwkFromEd25519PublicKey(bobPublicKeyED25519);
const bobX25519JwkPrivateKey = await x25519JwkFromMnemonic(bobSeed);

console.log(publicKeyfromX25519Jwk(bobX25519JwkPrivateKey));
console.log(publicKeyfromX25519Jwk(bobX25519JwkPublicKey));
console.log(privateKeyfromX25519Jwk(bobX25519JwkPrivateKey));
```

### Make shared key using ECDH-ES

```javascript
const { ephemeralPrivateKey1, ephemeralPublicKey1 } =
    generateX25519EphemeralKeyPair();
const { ephemeralPrivateKey2, ephemeralPublicKey2 } =
    generateX25519EphemeralKeyPair();

const sharedKey1 = deriveSharedKey(ephemeralPrivateKey1, ephemeralPublicKey2);
const sharedKey2 = deriveSharedKey(ephemeralPrivateKey2, ephemeralPublicKey1);
```

### Connect to Websocket Server with Receiving Connect Request Message

Check [example](./examples/websocket) for more detail.

```javascript
const mnemonic =
    "bamboo absorb chief dog box envelope leisure pink alone service spin more";
const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
const agent = new InfraDIDCommAgent(
    "http://data-market.test.newnal.com:9000",
    did,
    mnemonic,
    "HOLDER",
);
const encoded = "connectRequestMessageCreatedByPeer";

agent.setDIDAuthCallback(didAuthCallback);
agent.setDIDConnectedCallback(didConnectedCallback);
agent.setDIDAuthFailedCallback(didAuthFailedCallback);
agent.initReceivingConnectRequest(encoded);
```

### Connect to Websocket Server with Creating Connect Request Message

```javascript
const mnemonic =
    "bamboo absorb chief dog box envelope leisure pink alone service spin more";
const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
const agent = new InfraDIDCommAgent(
    "http://data-market.test.newnal.com:9000",
    did,
    mnemonic,
    "HOLDER",
);

agent.setDIDAuthCallback(didAuthCallback);
agent.setDIDConnectedCallback(didConnectedCallback);
agent.setDIDAuthFailedCallback(didAuthFailedCallback);
agent.initCreatingDynamicConnectRequest(context, 30, setConnectRequestCallback);
```
