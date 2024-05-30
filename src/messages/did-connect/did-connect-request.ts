/**
 * Represents a request message for DID connection with detailed information.
 */

import { deflateAndEncode, inflateAndDecode } from "../../utils/coding";
import { Context, Initiator } from "../commons";

export class DIDConnectRequestMessage {
    type: string = "DIDConnectReq";
    from: string;
    createdTime: number;
    expiresTime: number;
    body: {
        initiator: Initiator;
        context: Context;
    };
    /**
     * Constructs a DIDConnectRequestMessage instance.
     * @param {String} type - The type of the message.
     * @param {String} from - The sender of the message.
     * @param {Number} createdTime - The creation time of the message.
     * @param {Number} expiresTime - The expiration time of the message.
     * @param {Object} initiator - The initiator's details.
     * @param {Object} context - The context details.
     */
    constructor(
        from: string,
        createdTime: number,
        expiresTime: number,
        initiator: Initiator,
        context: Context,
    ) {
        this.from = from;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            initiator: initiator,
            context: context,
        };
    }

    /**
     * Converts the instance to a standard JSON object.
     * @returns {object} The JSON representation of the instance.
     */
    toJSON(): Record<string, any> {
        return {
            type: this.type,
            from: this.from,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: this.body,
        };
    }

    /**
     * Converts the instance to a compact JSON object, with abbreviated keys.
     * @returns {object} The compact JSON representation of the instance.
     */
    toCompactJSON(): Record<string, any> {
        return {
            type: this.type,
            from: this.from,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: {
                i: {
                    se: this.body.initiator.serviceEndpoint,
                    sid: this.body.initiator.socketId,
                },
                c: {
                    d: this.body.context.domain,
                    a: this.body.context.action,
                },
            },
        };
    }

    /**
     * Converts the instance to a minimal JSON object, containing only the most essential information.
     * @returns {object} The minimal JSON representation of the instance.
     */
    toMinimalJSON(): Record<string, any> {
        return {
            type: this.type,
            from: this.from,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: {
                i: {
                    sid: this.body.initiator.socketId,
                },
                c: {
                    d: this.body.context.domain,
                    a: this.body.context.action,
                },
            },
        };
    }

    /**
     * Creates an instance from a JSON object.
     * @param {any} json - The JSON object to convert from.
     * @returns {DIDConnectRequestMessage} The new instance created from the JSON object.
     * @throws {Error} Throws an error if the JSON object is missing required keys.
     */
    static fromJSON(json: Record<string, any>): DIDConnectRequestMessage {
        const body: Record<string, any> = json.body;

        let initiator: Initiator;
        let context: Context;

        if ("i" in body && "c" in body) {
            initiator = new Initiator({
                socketId: body.i.sid,
                serviceEndpoint: "se" in body.i ? body.i.se : undefined,
            });
            context = new Context(body.c.d, body.c.a);
        } else {
            initiator = new Initiator(body.initiator);
            context = new Context(body.context.domain, body.context.action);
        }

        return new DIDConnectRequestMessage(
            json.from,
            json.createdTime,
            json.expiresTime,
            initiator,
            context,
        );
    }

    /**
     * Decodes an encoded DIDConnectRequestMessage.
     * @param {string} encoded - The encoded message to decode.
     * @returns {Promise<DIDConnectRequestMessage>} A promise that resolves to the decoded message.
     * @throws {Error} Throws an error if decoding fails.
     */
    static decode(encoded: string): DIDConnectRequestMessage {
        try {
            const data = inflateAndDecode(encoded);
            return this.fromJSON(data);
        } catch (e) {
            throw e;
        }
    }

    /**
     * Encodes the DIDConnectRequestMessage.
     * @param {CompressionLevel} compressionLevel - The compression level to use.
     * @returns {Promise<string>} A promise that resolves to the encoded message.
     * @throws {Error} Throws an error if encoding fails.
     */
    encode(compressionLevel: CompressionLevel): string {
        try {
            let data: Record<string, any>;
            switch (compressionLevel) {
                case CompressionLevel.RAW:
                    data = this.toJSON();
                    break;
                case CompressionLevel.COMPACT:
                    data = this.toCompactJSON();
                    break;
                case CompressionLevel.MINIMAL:
                    data = this.toMinimalJSON();
                    break;
                default:
                    throw new Error("Unsupported compression level");
            }

            return deflateAndEncode(data);
        } catch (e) {
            throw e; // Rethrow the exception
        }
    }
}

export enum CompressionLevel {
    RAW = "raw",
    COMPACT = "compact",
    MINIMAL = "minimal",
}
