import { Context } from "../../src/messages/commons";
import { didConnectRequest } from "../../src/websocket/dynamic-qr";
import { InfraDIDCommAgent } from "../../src/websocket/index";

async function dynamic_qr_works() {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const client = new InfraDIDCommAgent(
        "http://0.0.0.0:8000",
        did,
        mnemonic,
        "VERIFIER",
    );
    const context = new Context("newnal", "connect");
    await didConnectRequest(client, context, 2, message => {
        console.log(message);
    });
}

dynamic_qr_works();
