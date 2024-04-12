/**
 * Represents a request message for DID connection with detailed information.
 */

import { inflateAndDecode } from "@src/utils/encode";

export class DIDConnectRequestMessage {
    type: string;
    from: string;
    created_time: number;
    expires_time: number;
    body: {
        initiator: Initiator;
        context: Context;
    };
    /**
     * Constructs a DIDConnectRequestMessage instance.
     * @param {String} type - The type of the message.
     * @param {String} from - The sender of the message.
     * @param {Number} created_time - The creation time of the message.
     * @param {Number} expires_time - The expiration time of the message.
     * @param {Object} initiator - The initiator's details.
     * @param {Object} context - The context details.
     */
    constructor(
        type: string,
        from: string,
        created_time: number,
        expires_time: number,
        initiator: Initiator,
        context: Context,
    ) {
        this.type = type;
        this.from = from;
        this.created_time = created_time;
        this.expires_time = expires_time;
        this.body = {
            initiator: initiator,
            context: context,
        };
    }

    /**
     * Converts the instance to a standard JSON object.
     * @returns {object} The JSON representation of the instance.
     */
    toJSON(): object {
        return {
            type: this.type,
            from: this.from,
            created_time: this.created_time,
            expires_time: this.expires_time,
            body: this.body,
        };
    }

    /**
     * Converts the instance to a compact JSON object, with abbreviated keys.
     * @returns {object} The compact JSON representation of the instance.
     */
    toCompactJSON(): object {
        return {
            type: this.type,
            from: this.from,
            created_time: this.created_time,
            expires_time: this.expires_time,
            body: {
                i: {
                    se: this.body.initiator.service_endpoint,
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
    toMinimalJSON(): object {
        return {
            type: this.type,
            from: this.from,
            created_time: this.created_time,
            expires_time: this.expires_time,
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
        const body = json.body;

        let initiator: Initiator;
        let context: Context;

        // Checking for Compact or Minimal JSON by looking for specific keys,
        // Otherwise, it's treated as normal request message JSON.
        if ("i" in body && "c" in body) {
            // This handles both CompactJSONBody and MinimalJSONBody
            const compactOrMinimalBody = body as
                | CompactRequestMessageBody
                | MinimalRequestMessageJSONBody;
            initiator = {
                socketId: compactOrMinimalBody.body.i.sid,
                // 'service_endpoint' might not be provided in MinimalJSON
                service_endpoint:
                    "se" in compactOrMinimalBody.body.i
                        ? compactOrMinimalBody.body.i.se
                        : undefined,
            };
            context = {
                domain: compactOrMinimalBody.body.c.d,
                action: compactOrMinimalBody.body.c.a,
            };
        } else {
            const requestMessageBody = body as RequestMessageBody;
            initiator = requestMessageBody.body.initiator;
            context = requestMessageBody.body.context;
        }

        return new DIDConnectRequestMessage(
            json.type,
            json.from,
            json.created_time,
            json.expires_time,
            initiator,
            context,
        );
    }

    static async decode(encoded: string): Promise<DIDConnectRequestMessage> {
        try {
            const data = await inflateAndDecode(encoded);
            return this.fromJSON(data);
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
type Initiator = {
    /**
     * The type of the initiator, if available.
     */
    type?: string;
    /**
     * The service endpoint of the initiator, if provided.
     */
    service_endpoint?: string;
    /**
     * The unique socket ID of the initiator.
     */
    socketId: string;
};

/**
 * Describes the context in which the connection is being initiated,
 * including the domain and action being performed.
 */
type Context = {
    /**
     * The domain within which the action is taking place.
     */
    domain: string;
    /**
     * The specific action being initiated.
     */
    action: string;
};

/**
 * Represents the body structure of a Normal JSON message, including
 * details about the initiator and the context of the message.
 */
interface RequestMessageBody {
    body: {
        initiator: {
            type: string;
            serviceEndpoint: string;
            socketId: string;
        };
        context: {
            domain: string;
            action: string;
        };
    };
}

/**
 * Describes the structure of a Compact JSON message body, which is a
 * more condensed version of the message including initiator and context
 * information with abbreviated keys.
 */
interface CompactRequestMessageBody {
    body: {
        i: {
            se: string; // Service Endpoint
            sid: string; // Socket ID
        };
        c: {
            d: string; // Domain
            a: string; // Action
        };
    };
}

/**
 * Outlines the structure for a Minimal JSON message body, similar to
 * CompactJSONBody but potentially lacking the service endpoint.
 */
interface MinimalRequestMessageJSONBody {
    body: {
        i: {
            sid: string; // Socket ID only, service endpoint may be omitted
        };
        c: {
            d: string; // Domain
            a: string; // Action
        };
    };
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
                    created_time: this.createdTime,
                }),
                ...(this.expiresTime !== undefined && {
                    expires_time: this.expiresTime,
                }),
                // body: {
                //     context: this.context.toJson(),
                //     socketId: this.socketId,
                //     peerSocketId: this.peerSocketId,
                // }
            };
            return data;
        } catch (e) {
            throw e; // Rethrow the exception in JavaScript/TypeScript
        }
    }
}

export class DIDAuthMessage {
    id: string;
    type: string = "DIDAuthMessage";
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
}

export class DIDAuthFailedMessage {
    id: string;
    type: string;
    from: string;
    to: string[];
    created_time: number;
    expires_time: number;
    body: {
        context: Context;
        reason: string;
    };
    constructor(
        id: string,
        type: string,
        from: string,
        to: string[],
        created_time: number,
        expires_time: number,
        context: Context,
        reason: string,
    ) {
        this.id = id;
        this.type = type;
        this.from = from;
        this.to = to;
        this.created_time = created_time;
        this.expires_time = expires_time;
        this.body = {
            context: context,
            reason: reason,
        };
    }
}

export class DIDConnectedMessage {
    id: string;
    type: string;
    from: string;
    to: string[];
    created_time: number;
    expires_time: number;
    body: {
        context: Context;
        status: string;
    };
    constructor(
        id: string,
        type: string,
        from: string,
        to: string[],
        created_time: number,
        expires_time: number,
        context: Context,
        status: string,
    ) {
        this.id = id;
        this.type = type;
        this.from = from;
        this.to = to;
        this.created_time = created_time;
        this.expires_time = expires_time;
        this.body = {
            context: context,
            status: status,
        };
    }
}

export enum CompressType {
    RAW = "raw",
    COMPACT = "compact",
    MINIMAL = "minimal",
}
