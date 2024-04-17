export class Initiator {
    type?: string;
    serviceEndpoint?: string;
    socketId: string;

    /**
     * Creates a new instance of the Initiator class.
     * @param socketId The socket ID of the Initiator.
     * @param type The type of the Initiator.
     * @param serviceEndpoint The service endpoint of the Initiator.
     */
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

    /**
     * Creates an Initiator instance from a compact JSON object.
     * @param json The compact JSON object.
     * @returns An Initiator instance.
     */
    static fromCompactJson(json: Record<string, any>): Initiator {
        return new Initiator({
            serviceEndpoint: json["se"],
            socketId: json["sid"],
        });
    }

    /**
     * Creates an Initiator instance from a minimal compact JSON object.
     * @param json The minimal compact JSON object.
     * @returns An Initiator instance.
     */
    static fromMinimalCompactJson(json: Record<string, any>): Initiator {
        return new Initiator({
            socketId: json["sid"],
        });
    }

    /**
     * Converts the Initiator instance to a JSON object.
     * @returns The JSON object representing the Initiator instance.
     */
    toJson(): Record<string, any> {
        return {
            type: this.type,
            serviceEndpoint: this.serviceEndpoint,
            socketId: this.socketId,
        };
    }

    /**
     * Converts the Initiator instance to a compact JSON object.
     * @returns The compact JSON object representing the Initiator instance.
     */
    toCompactJson(): Record<string, any> {
        return {
            se: this.serviceEndpoint,
            sid: this.socketId,
        };
    }

    /**
     * Converts the Initiator instance to a minimal compact JSON object.
     * @returns The minimal compact JSON object representing the Initiator instance.
     */
    toMinimalCompactJson(): Record<string, any> {
        return {
            sid: this.socketId,
        };
    }
}
