import * as jose from "jose";

import { compactJws } from "../src/common/jose/index";

// Test code
describe("compactJwsWorks", () => {
    test("JWS", async () => {
        const jwm = JSON.stringify({
            type: "DIDConnectReq",
            from: "did:infra:01:PUB_K1_8KeFXUKBR9kctm3eafs2tgqK3XxcqsnHtRp2kjSdfDFSn3x4bK",
            created_time: 1662441420,
            expires_time: 1662441435,
            body: {
                initiator: {
                    type: "HOLDER",
                    serviceEndpoint: "https://wss.infradid.io",
                    socketId: "12/Ph3SXvXZKCWQFoiwO5Qp",
                },
                context: {
                    domain: "newnal",
                    action: "connect",
                },
            },
        });
        const payload = new TextEncoder().encode(jwm);
        const epk_pair = await jose.generateKeyPair("EdDSA", {
            extractable: true,
        });
        console.log(epk_pair);
        const jws = await compactJws(payload, epk_pair.privateKey, {
            typ: "JWM",
            alg: "EdDSA",
        });
        console.log("Compact JWS created:", jws);
        await jose.jwtVerify(jws, epk_pair.publicKey);
    });
});
