import { Context } from "../../src/messages/commons";
import { connectRequestDynamic } from "../../src/websocket/connect-request";
import { InfraDIDCommAgent } from "../../src/websocket/index";
import { DID_CHAIN_ENDPOINT } from "./common";

async function dynamic_qr_works() {
    const mnemonic =
        "bamboo absorb chief dog box envelope leisure pink alone service spin more";
    const did = "did:infra:01:5EX1sTeRrA7nwpFmapyUhMhzJULJSs9uByxHTc6YTAxsc58z";
    const client = new InfraDIDCommAgent(
        "http://data-market.test.newnal.com:9000",
        did,
        mnemonic,
        "VERIFIER",
        DID_CHAIN_ENDPOINT,
    );
    const context = new Context("newnal", "connect");
    await connectRequestDynamic(client, context, 2, message => {
        console.log(message);
    });
}

dynamic_qr_works();
