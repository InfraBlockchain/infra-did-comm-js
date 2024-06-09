export class VPSubmitResMessage {
    id: string;
    type: string = "VPSubmitRes";
    from: string;
    to: string[];
    ack?: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        status: string;
    };

    /**
     * Creates a new VPSubmitResMessage instance.
     * @param id - The unique identifier of the message.
     * @param from - The sender of the message.
     * @param to - The recipients of the message.
     * @param createdTime - The timestamp when the message was created.
     * @param expiresTime - The timestamp when the message expires.
     * @param VP - The verifiable presentation.
     * @param ack - The acknowledgments (optional).
     */
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        status: string,
        ack?: string[],
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            status,
        };
        if (ack) {
            this.ack = ack;
        }
    }

    /**
     * Creates an instance from a JSON object.
     * @param {any} json - The JSON object to convert from.
     * @returns {VPSubmitResMessage} The new instance created from the JSON object.
     * @throws {Error} Throws an error if the JSON object is missing required keys.
     */
    static fromJSON(json: Record<string, any>): VPSubmitResMessage {
        return new VPSubmitResMessage(
            json.id,
            json.from,
            json.to,
            json.createdTime,
            json.expiresTime,
            json.body.status,
            json.ack,
        );
    }
}
