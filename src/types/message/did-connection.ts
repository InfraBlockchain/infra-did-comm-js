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
        initiator: {
            type: string;
            service_endpoint: string;
            socketId: string;
        };
        context: {
            did: string;
            name: string;
        };
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
        initiator: {
            type: string;
            service_endpoint: string;
            socketId: string;
        },
        context: {
            did: string;
            name: string;
        },
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
}

/**
 * Represents a compact version of the DIDConnectRequestMessage with abbreviated properties.
 */
export class CompactDIDConnectRequestMessage {
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
    /**
     * Constructs a CompactDIDConnectRequestMessage instance.
     * @param {String} type - The type of the message.
     * @param {String} from - The sender of the message.
     * @param {Number} created_time - The creation time of the message.
     * @param {Number} expires_time - The expiration time of the message.
     * @param {String} service_endpoint - The service endpoint in the initiator object.
     * @param {String} socketId - The socket ID in the initiator object.
     * @param {String} domain - The domain in the context object.
     * @param {String} action - The action in the context object.
     */
    constructor(
        type: string,
        from: string,
        created_time: number,
        expires_time: number,
        service_endpoint: string,
        socketId: string,
        domain: string,
        action: string,
    ) {
        this.type = type;
        this.from = from;
        this.created_time = created_time;
        this.expires_time = expires_time;
        this.body = {
            i: {
                se: service_endpoint,
                sid: socketId,
            },
            c: {
                d: domain,
                a: action,
            },
        };
    }
}

/**
 * Represents the most minimal version of the DIDConnectRequestMessage with only essential properties which assumes partipants know which websocket server to connect
 */
export class MinimalCompactDIDConnectRequestMessage {
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
    /**
     * Constructs a MinimalCompactDIDConnectRequestMessage instance.
     * @param {String} type - The type of the message.
     * @param {String} from - The sender of the message.
     * @param {Number} created_time - The creation time of the message.
     * @param {Number} expires_time - The expiration time of the message.
     * @param {String} socketId - The socket ID in the initiator object.
     * @param {String} domain - The domain in the context object.
     * @param {String} action - The action in the context object.
     */
    constructor(
        type: string,
        from: string,
        created_time: number,
        expires_time: number,
        socketId: string,
        domain: string,
        action: string,
    ) {
        this.type = type;
        this.from = from;
        this.created_time = created_time;
        this.expires_time = expires_time;
        this.body = {
            i: {
                sid: socketId,
            },
            c: {
                d: domain,
                a: action,
            },
        };
    }
}
