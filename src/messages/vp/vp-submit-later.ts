export class VPSubmitLaterMessage {
    id: string;
    type: string = "VPSubmitLater";
    from: string;
    to: string[];
    ack?: string[];
    createdTime: number;
    expiresTime: number;
    body: {};

    /**
     * Creates a new VPSubmitLaterMessage instance.
     * @param id - The unique identifier of the message.
     * @param from - The sender of the message.
     * @param to - The recipients of the message.
     * @param createdTime - The timestamp when the message was created.
     * @param expiresTime - The timestamp when the message expires.
     * @param ack - The acknowledgments (optional).
     */
    constructor(
        id: string,
        from: string,
        to: string[],
        createdTime: number,
        expiresTime: number,
        ack?: string[],
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {};
        if (ack) {
            this.ack = ack;
        }
    }
}
