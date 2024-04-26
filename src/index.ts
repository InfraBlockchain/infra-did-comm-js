import * as joseOriginal from "jose";
import { extendJose } from "jose-browser";

import * as crypto from "./crypto";
import * as messages from "./messages";
import * as utils from "./utils";
import * as websocket from "./websocket";

const isBrowser = typeof window !== "undefined";
const isServer = typeof global !== "undefined";

let jose: any;

if (isBrowser) {
    jose = extendJose(joseOriginal);
} else if (isServer) {
    jose = joseOriginal;
} else {
    throw new Error("Environment is unknown: jose is not initialized.");
}

console.log(`Environment is set: ${isBrowser ? "browser" : "server"}`);

export { crypto, jose, joseOriginal, messages, utils, websocket };
