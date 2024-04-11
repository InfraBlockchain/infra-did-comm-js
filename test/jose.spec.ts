import * as jose from "jose";

import { compactJws } from "../src/common/jose/index";

// Test code
describe("compactJwsWorks", () => {
    test("JWS", async () => {
        const json_serialized_payload = JSON.stringify({ test: "data" });
        const payload = new TextEncoder().encode(json_serialized_payload);
        const privateKey = await jose.generateSecret("Ed25519", {
            extractable: true,
        });
        const jws = await compactJws(payload, privateKey, {
            typ: "JWM",
            alg: "EdDSA",
        });
        console.log("Compact JWS created:", jws);
    });
});
