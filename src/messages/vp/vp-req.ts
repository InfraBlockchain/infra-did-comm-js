import { VCRequirement } from "@src/agent";

export class VPReqMessage {
    id: string;
    type: string = "VPReq";
    from: string;
    to: string[];
    createdTime: number;
    expiresTime: number;
    body: {
        vcRequirements: VCRequirement[];
        challenge: string;
    };

    /**
     * Creates a new VPReqMessage instance.
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
        vcRequirements: VCRequirement[],
        challenge: string,
    ) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.createdTime = createdTime;
        this.expiresTime = expiresTime;
        this.body = {
            vcRequirements,
            challenge,
        };
    }
}
