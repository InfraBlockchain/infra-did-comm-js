// interface Initiator {
//     type: String;
//     service_endpoint: String;
//     socketId: String;
// }

// interface Context {
//     did: String;
//     name: String;
// }

/**
 * Represents a request message for DID connection with detailed information.
 */
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
    fromJSON(json: any): DIDConnectRequestMessage {
        if (
            !json.type ||
            !json.from ||
            !json.created_time ||
            !json.expires_time
        ) {
            throw new Error("Invalid JSON: Missing required keys");
        }

        let initiator: Initiator;

        // Use type guards to differentiate between CompactJSON and MinimalJSON
        if ("i" in json.body && "se" in json.body.i) {
            // Compact format
            const compact: CompactJSON = json;
            initiator = {
                service_endpoint: compact.body.i.se,
                socketId: compact.body.i.sid,
            };
        } else if ("i" in json.body) {
            // Minimal format
            const minimal: MinimalJSON = json;
            initiator = {
                socketId: minimal.body.i.sid,
            };
        } else {
            throw new Error("Invalid JSON: Unrecognized format");
        }

        const context = {
            domain: json.body.c.d,
            action: json.body.c.a,
        };

        return new DIDConnectRequestMessage(
            json.type,
            json.from,
            json.created_time,
            json.expires_time,
            initiator,
            context,
        );
    }
}

// Define types for initiator and context to ensure type safety
type Initiator = {
    type?: string;
    service_endpoint?: string;
    socketId: string;
};

type Context = {
    domain: string;
    action: string;
};

// Define interfaces for CompactJSON and MinimalJSON formats
interface CompactJSON {
    type: string;
    from: string;
    created_time: number;
    expires_time: number;
    body: {
        i: {
            se: string;
            sid: string;
        };
        c: {
            d: string;
            a: string;
        };
    };
}

interface MinimalJSON {
    type: string;
    from: string;
    created_time: number;
    expires_time: number;
    body: {
        i: {
            sid: string;
        };
        c: {
            d: string;
            a: string;
        };
    };
}
