import * as jose from "jose";

import { toJWS } from "./jws/index";

// Test code
describe("toJWSWorks", async () => {
    const payload = { test: "data" };
    const privateKey = await jose.generateSecret("EdDSA");
    const jws = await toJWS(payload, privateKey);
    console.log("JWS created:", jws);
});
