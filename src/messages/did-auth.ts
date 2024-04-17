import { Context } from "./commons";

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

    /**
     * Creates a new DIDAuthMessage instance.
     * @param id - The unique identifier of the message.
     * @param from - The sender of the message.
     * @param to - The recipients of the message.
     * @param createdTime - The timestamp when the message was created.
     * @param expiresTime - The timestamp when the message expires.
     * @param context - The context of the message.
     * @param socketId - The socket ID associated with the message.
     * @param peerSocketId - The peer socket ID associated with the message.
     */
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

    /**
     * Converts the DIDAuthMessage instance to a JSON object.
     * @returns The JSON representation of the DIDAuthMessage.
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
                socketId: this.body.socketId,
                peerSocketId: this.body.peerSocketId,
            },
        };
    }
}
