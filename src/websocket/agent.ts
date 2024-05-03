import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

import {
    DIDAuthInitMessage,
    DIDConnectRequestMessage,
} from "../../src/messages";
import { Context } from "../../src/messages/commons";
import { connectRequestDynamic, connectRequestStatic } from "./connect-request";
import {
    messageHandler,
    sendDIDAuthInitMessageToReceiver,
} from "./message-handler";

export class InfraDIDCommAgent {
    did: string;
    mnemonic: string;
    role: string = "HOLDER";
    url: string;

    socket: Socket;
    peerInfo: { [key: string]: string } = {}; // Peers' info {did, socketId}

    isDIDConnected: boolean = false;
    isDIDVerified: boolean = false;
    isReceivedDIDAuthInit: boolean = false;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    didAuthCallback: (peerDID: string) => boolean = peerDID => true;
    didConnectedCallback: (peerDID: string) => void = peerDID => {};
    didAuthFailedCallback: (peerDID: string) => void = peerDID => {};
    didVerifyCallback: (peerDID: string) => boolean = peerDID => true;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    private _socketIdPromiseResolver: (value: string) => void;
    socketId: Promise<string>;

    constructor(url: string, did: string, mnemonic: string, role: string) {
        this.url = url;
        this.did = did;
        this.mnemonic = mnemonic;
        if (role === "HOLDER" || role === "VERIFIER") {
            this.role = role;
        } else {
            throw new Error("Role must be HOLDER or VERIFIER");
        }

        this.socket = io(url, {
            transports: ["websocket"],
            autoConnect: false,
        });

        this.socket.on("connect", () => {
            this._socketIdPromiseResolver(this.socket.id);
            console.log("Socket connected", this.socket.id);
        });

        this.socket.on("disconnect", () => {
            this._socketIdPromiseResolver("");
            console.log("Socket disconnected");
        });

        this.resetSocketIdPromise();

        this.onMessage();
    }

    private resetSocketIdPromise(): void {
        this.socketId = new Promise(resolve => {
            this._socketIdPromiseResolver = resolve;
        });
    }

    setDIDAuthCallback(callback: (peerDID: string) => boolean): void {
        this.didAuthCallback = callback;
    }

    setDIDConnectedCallback(callback: (peerDID: string) => void): void {
        this.didConnectedCallback = callback;
    }

    setDIDAuthFailedCallback(callback: (peerDID: string) => void): void {
        this.didAuthFailedCallback = callback;
    }

    setDIDVerifyCallback(callback: (peerDID: string) => boolean): void {
        this.didVerifyCallback = callback;
    }

    init(): void {
        this.socket.connect();
    }

    async initReceivingConnectRequest(encoded: string): Promise<void> {
        this.socket.connect();
        await this.sendDIDAuthInitMessage(encoded);
    }

    async initReceivingStaticConnectRequest(
        serviceEndpoint: string,
        context: Context,
        verifierDID?: string,
    ): Promise<void> {
        await connectRequestStatic(this, serviceEndpoint, context, verifierDID);
    }

    async initCreatingDynamicConnectRequest(
        context: Context,
        timeout: number,
        callback: (message: string) => void,
    ): Promise<void> {
        await connectRequestDynamic(this, context, timeout, callback);
    }

    reset(): void {
        this.peerInfo = {};
        this.isDIDConnected = false;
        this.isReceivedDIDAuthInit = false;
    }

    connect(): void {
        this.socket.connect();
    }

    disconnect(): void {
        this.reset();
        this.socket.disconnect();
    }

    onMessage(): void {
        this.socket.on("message", (data: any) => {
            messageHandler(
                data,
                this.mnemonic,
                this.did,
                this,
                this.didAuthCallback,
                this.didConnectedCallback,
                this.didAuthFailedCallback,
                this.didVerifyCallback,
            );
        });
    }

    async sendDIDAuthInitMessage(encoded: string): Promise<void> {
        try {
            const didConnectRequestMessage =
                DIDConnectRequestMessage.decode(encoded);

            const currentTime = Math.floor(Date.now() / 1000);
            const id = uuidv4();

            const receiverDID = didConnectRequestMessage.from;
            const peerSocketId =
                didConnectRequestMessage.body.initiator.socketId;

            const mySocketId = await this.socketId;

            const didAuthInitMessage = new DIDAuthInitMessage(
                id,
                this.did,
                [receiverDID],
                currentTime,
                currentTime + 30000,
                didConnectRequestMessage.body.context,
                mySocketId,
                peerSocketId,
            );
            const message = await sendDIDAuthInitMessageToReceiver(
                didAuthInitMessage,
                this.mnemonic,
                receiverDID,
                this,
            );

            this.peerInfo = { did: receiverDID, socketId: peerSocketId };
            this.socket.emit("message", { to: peerSocketId, m: message });
            console.log(
                `DIDAuthInitMessage sent to ${peerSocketId}, message: ${message}`,
            );
        } catch (error) {
            throw new Error(`Failed to sendDIDAuthInitMessage: ${error}`);
        }
    }
}
