/**
 * Represents a request message for DID connection with detailed information.
 */

import { deflateAndEncode, inflateAndDecode } from "@src/utils/encode";

export class DIDConnectRequestMessage {
    type: string;
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
        type: string,
        from: string,
        createdTime: number,
        expiresTime: number,
        initiator: Initiator,
        context: Context,
    ) {
        this.type = type;
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
        // Extracting body for easier manipulation and type checking
        const body: Record<string, any> = json.body;

        let initiator: Initiator;
        let context: Context;

        // Checking for Compact or Minimal JSON by looking for specific keys,
        // Otherwise, it's treated as normal request message JSON.
        if ("i" in body && "c" in body) {
            // This handles both CompactJSONBody and MinimalJSONBody
            initiator = new Initiator({
                socketId: body.i.sid,
                // 'service_endpoint' might not be provided in MinimalJSON
                serviceEndpoint: "se" in body.i ? body.i.se : undefined,
            });
            context = new Context(body.c.d, body.c.a);
        } else {
            initiator = new Initiator(body.initiator);
            context = new Context(body.context.domain, body.context.action);
        }

        return new DIDConnectRequestMessage(
            json.type,
            json.from,
            json.createdTime,
            json.expiresTime,
            initiator,
            context,
        );
    }

    static async decode(encoded: string): Promise<DIDConnectRequestMessage> {
        try {
            const data = await inflateAndDecode(encoded);
            return this.fromJSON(data);
        } catch (e) {
            throw e;
        }
    }

    async encode(compressionLevel: CompressionLevel): Promise<string> {
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

            return await deflateAndEncode(data);
        } catch (e) {
            throw e; // Rethrow the exception
        }
    }
}

/**
 * Represents the entity initiating the connection.
 * It includes optional type and service endpoint fields,
 * and a mandatory socket ID.
 */

class Initiator {
    type?: string;
    serviceEndpoint?: string;
    socketId: string;

    constructor({
        socketId,
        type,
        serviceEndpoint,
    }: {
        socketId: string;
        type?: string;
        serviceEndpoint?: string;
    }) {
        this.type = type;
        this.socketId = socketId;
        this.serviceEndpoint = serviceEndpoint;
    }

    static fromCompactJson(json: Record<string, any>): Initiator {
        return new Initiator({
            serviceEndpoint: json["se"],
            socketId: json["sid"],
        });
    }

    static fromMinimalCompactJson(json: Record<string, any>): Initiator {
        return new Initiator({
            socketId: json["sid"],
        });
    }

    toJson(): Record<string, any> {
        return {
            type: this.type,
            serviceEndpoint: this.serviceEndpoint,
            socketId: this.socketId,
        };
    }

    toCompactJson(): Record<string, any> {
        return {
            se: this.serviceEndpoint,
            sid: this.socketId,
        };
    }

    toMinimalCompactJson(): Record<string, any> {
        return {
            sid: this.socketId,
        };
    }
}

/**
 * Describes the context in which the connection is being initiated,
 * including the domain and action being performed.
 */
class Context {
    domain: string;
    action: string;

    constructor(domain: string, action: string) {
        this.domain = domain;
        this.action = action;
    }

    static fromJson(json: Record<string, any>): Context {
        const jsonData = json as { domain: string; action: string };
        return new Context(jsonData.domain, jsonData.action);
    }

    static fromCompactJson(json: Record<string, any>): Context {
        const jsonCompact = json as { d: string; a: string };
        return new Context(jsonCompact.d, jsonCompact.a);
    }

    static fromMinimalCompactJson(json: Record<string, any>): Context {
        return this.fromCompactJson(json);
    }

    toJson(): Record<string, any> {
        return {
            domain: this.domain,
            action: this.action,
        };
    }

    toCompactJson(): Record<string, any> {
        return {
            d: this.domain,
            a: this.action,
        };
    }

    toMinimalCompactJson(): Record<string, any> {
        return this.toCompactJson();
    }
}

export class DIDAuthInitMessage {
    id: string;
    type: string = "DIDAuthInitMessage";
    from: string;
    to: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        context: Context;
        socketId: string;
        peerSocketId: string;
    };
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        context: Context,
        socketId: string,
        peerSocketId: string,
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            context: context,
            socketId: socketId,
            peerSocketId: peerSocketId,
        };
    }

    toJson(): Record<string, any> {
        try {
            const data: Record<string, any> = {
                id: this.id,
                type: this.type,
                from: this.from,
                to: this.to,
                // Only add createdTime and expiresTime if they are not undefined
                ...(this.createdTime !== undefined && {
                    createdTime: this.createdTime,
                }),
                ...(this.expiresTime !== undefined && {
                    expiresTime: this.expiresTime,
                }),
                body: {
                    context: this.body.context.toJson(),
                    socketId: this.body.socketId,
                    peerSocketId: this.body.peerSocketId,
                },
            };
            return data;
        } catch (e) {
            throw e; // Rethrow the exception in JavaScript/TypeScript
        }
    }
}

export class DIDAuthMessage {
    id: string;
    type: string = "DIDAuth";
    from: string;
    to: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        context: Context;
        socketId: string;
        peerSocketId: string;
    };
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        context: Context,
        socketId: string,
        peerSocketId: string,
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            context: context,
            socketId: socketId,
            peerSocketId: peerSocketId,
        };
    }

    toJson(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            from: this.from,
            to: this.to,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: {
                context: this.body.context.toJson(), // assuming Context has a toJson method
                socketId: this.body.socketId,
                peerSocketId: this.body.peerSocketId,
            },
        };
    }
}

export class DIDAuthFailedMessage {
    id: string;
    type: string = "DIDAuthFailed";
    from: string;
    to: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        context: Context;
        reason: string;
    };
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        context: Context,
        reason: string,
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            context: context,
            reason: reason,
        };
    }

    toJson(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            from: this.from,
            to: this.to,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: {
                context: this.body.context.toJson(), // assuming Context has a toJson method
                reason: this.body.reason,
            },
        };
    }
}

export class DIDConnectedMessage {
    id: string;
    type: string = "DIDConnected";
    from: string;
    to: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        context: Context;
        status: string;
    };
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        context: Context,
        status: string,
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            context: context,
            status: status,
        };
    }

    toJson(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            from: this.from,
            to: this.to,
            createdTime: this.createdTime,
            expiresTime: this.expiresTime,
            body: {
                context: this.body.context.toJson(), // assuming Context has a toJson method
                status: this.body.status,
            },
        };
    }
}

export enum CompressionLevel {
    RAW = "raw",
    COMPACT = "compact",
    MINIMAL = "minimal",
}
