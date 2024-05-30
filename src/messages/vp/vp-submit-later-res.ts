export class VPSubmitLaterResMessage {
    id: string;
    type: string = "VPSubmitLaterRes";
    from: string;
    to: string[];
    ack?: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        callbackUrl: string;
    };

    /**
     * Creates a new VPSubmitLaterResMessage instance.
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
        callbackUrl: string,
        ack?: string[],
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            callbackUrl,
        };
        if (ack) {
            this.ack = ack;
        }
    }
}
