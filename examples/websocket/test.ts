import { exportJWK } from "jose";

import { compactJWE, decryptJWE } from "../../src/crypto";
import {
    CompressionLevel,
    DIDConnectRequestMessage,
} from "../../src/messages/did-connect-request";
import {
    deriveSharedKey,
    privateKeyfromX25519Jwk,
    publicKeyfromX25519Jwk,
    x25519JwkFromMnemonic,
} from "../../src/utils";
import { InfraDIDCommAgent } from "../../src/websocket";

function didAuthCallback(peerDID: string): boolean {
    console.log("DID Auth Callback", peerDID);
    return true;
}

function didConnectedCallback(peerDID: string): void {
    console.log("DID Connected Callback", peerDID);
}

function didAuthFailedCallback(peerDID: string): void {
    console.log("DID Auth Failed Callback", peerDID);
}

async function test(): Promise<void> {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const agent = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "HOLDER",
    );

    const x25519JwkPrivateKey = x25519JwkFromMnemonic(mnemonic);
    const x25519JwkPublicKey = x25519JwkFromMnemonic(mnemonic);
    const sharedKey = deriveSharedKey(
        privateKeyfromX25519Jwk(x25519JwkPrivateKey),
        publicKeyfromX25519Jwk(x25519JwkPublicKey),
    );

    // const { ephemeralPrivateKey, ephemeralPublicKey } =
    //     generateX25519EphemeralKeyPair();
    // console.log(
    //     "ephemeralPublicKey",
    //     x25519JwkFromX25519PublicKey(ephemeralPublicKey),
    // );
    // const sharedKey = deriveSharedKey(
    //     ephemeralPrivateKey,
    //     publicKeyfromX25519Jwk(x25519JwkPublicKey),
    // );

    console.log("sharedKey", sharedKey);
    const jwkey = await exportJWK(sharedKey);

    const jwe =
        "eyJlcGsiOnsiY3J2IjoiWDI1NTE5Iiwia3R5IjoiT0tQIiwieCI6IllFZXBDOG1VcnMyMFI3YXBPMnlIdjdtdDk0T3JZQkFRVlBYc3NUNGxVRTAifSwiZW5jIjoiQTI1NkdDTSIsImFsZyI6IkVDREgtRVMifQ==..QZ9HPGvo01STp9Oc.-LXHR0Bsi2Y4U16GZm3rXqUs7ZpZRh1C4aGrqiAmtufmWFJD31GZyJlVU7YV6n3KeMocfOeSORYQP2ioBA-pPSjEyYsYtcWjoy7avDBmiAxELVNYuZbE5SFJaEYK3EO6_F2b4m_ghLgdvggc0MtJWAYVgBGgQ-fbgoWvqv23.W0EYQsA2WiRZUgsHUY3Q4";
    const plain = "";

    const encrypted = await compactJWE(plain, jwkey, x25519JwkPublicKey);
    console.log("encrypted", encrypted);

    const jwsFromJwe = await decryptJWE(jwe, jwkey);
    console.log("jwsFromJwe", jwsFromJwe);

    console.log("jwkey", jwkey);

    agent.setDIDAuthCallback(didAuthCallback);
    agent.setDIDConnectedCallback(didConnectedCallback);
    agent.setDIDAuthFailedCallback(didAuthFailedCallback);

    agent.init();
    const socketId = await agent.socketId;

    if (socketId) {
        const verifierSocketId = "JFx1rJdIZ2c8SxIWABZ1";
        const minimalCompactJson = {
            from: did,
            body: {
                i: { sid: verifierSocketId },
                c: { d: "pet-i.net", a: "connect" },
            },
        };

        const didConnectRequestMessage =
            DIDConnectRequestMessage.fromJSON(minimalCompactJson);
        const encoded = didConnectRequestMessage.encode(CompressionLevel.RAW);
        console.log("Received encoded request message: " + encoded);
        await agent.sendDIDAuthInitMessage(encoded);
    } else {
        console.log("Socket ID is null");
    }
}

async function main() {
    await test();
}

main();
