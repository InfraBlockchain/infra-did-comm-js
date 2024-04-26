import * as joseOriginal from "jose";
import { extendJose } from "jose-browser";

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

export { jose, joseOriginal };
