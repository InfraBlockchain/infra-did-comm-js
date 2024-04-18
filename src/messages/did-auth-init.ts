import { Context } from "./commons";

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

    /**
     * Creates a new instance of DIDAuthInitMessage.
     * @param id - The ID of the message.
     * @param from - The sender of the message.
     * @param to - The recipients of the message.
     * @param createdTime - The creation time of the message.
     * @param expiresTime - The expiration time of the message.
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
     * Converts the DIDAuthInitMessage instance to a JSON object.
     * @returns The JSON representation of the DIDAuthInitMessage.
     * @throws Any exception that occurs during the conversion.
     */
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
