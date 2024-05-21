import { Context } from "../commons";

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

    /**
     * Creates a new DIDConnectedMessage instance.
     * @param id - The ID of the message.
     * @param from - The sender of the message.
     * @param to - The recipients of the message.
     * @param createdTime - The timestamp when the message was created.
     * @param expiresTime - The timestamp when the message expires.
     * @param context - The context of the message.
     * @param status - The status of the message.
     */
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

    /**
     * Converts the DIDConnectedMessage instance to a JSON object.
     * @returns The JSON representation of the message.
     */
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
