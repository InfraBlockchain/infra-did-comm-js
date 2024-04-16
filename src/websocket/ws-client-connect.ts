import {
    DIDAuthInitMessage,
    DIDConnectRequestMessage,
} from "@src/types/messages/did-connect-request";
import { io,Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

import {
    messageHandler,
    sendDIDAuthInitMessageToReceiver,
} from "./message-handler";

export { InfraDIDCommSocketClient };

class InfraDIDCommSocketClient {
    did: string;
    mnemonic: string;
    role: string = "HOLDER";
    url: string;

    socket: Socket;
    peerInfo: { [key: string]: string } = {}; // Peers' info {did, socketId}

    isDIDConnected: boolean = false;
    isReceivedDIDAuthInit: boolean = false;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    didAuthInitCallback: (peerDID: string) => boolean = peerDID => true;
    didAuthCallback: (peerDID: string) => boolean = peerDID => true;
    didConnectedCallback: (peerDID: string) => void = peerDID => {};
    didAuthFailedCallback: (peerDID: string) => void = peerDID => {};
    /* eslint-enable @typescript-eslint/no-unused-vars */

    private _socketIdPromiseResolver: (value: string | null) => void;
    socketId: Promise<string | null>;

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
            console.log("Socket connected2", this.socket.id);
        });

        this.socket.on("disconnect", () => {
            this.resetSocketIdPromise();
            console.log("Socket disconnected");
        });

        this.resetSocketIdPromise();
    }

    private resetSocketIdPromise(): void {
        this.socketId = new Promise(resolve => {
            this._socketIdPromiseResolver = resolve;
        });
    }

    setDIDAuthInitCallback(callback: (peerDID: string) => boolean): void {
        this.didAuthInitCallback = callback;
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

    connect(): void {
        this.socket.connect();
    }

    disconnect(): void {
        this.peerInfo = {};
        this.isDIDConnected = false;
        this.isReceivedDIDAuthInit = false;
        this.socket.disconnect();
    }

    onMessage(): void {
        this.socket.on("message", (data: any) => {
            messageHandler(
                data,
                this.mnemonic,
                this.did,
                this,
                this.didAuthInitCallback,
                this.didAuthCallback,
                this.didConnectedCallback,
                this.didAuthFailedCallback,
            );
        });
    }

    async sendDIDAuthInitMessage(encoded: string): Promise<void> {
        const didConnectRequestMessage =
            await DIDConnectRequestMessage.decode(encoded);

        const currentTime = Math.floor(Date.now() / 1000);
        const id = uuidv4();

        const receiverDID = didConnectRequestMessage.from;
        const peerSocketId = didConnectRequestMessage.body.initiator.socketId;

        const didAuthInitMessage = new DIDAuthInitMessage(
            id,
            this.did,
            [receiverDID],
            currentTime,
            currentTime + 30000,
            didConnectRequestMessage.body.context,
            this.socket.id,
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
        console.log(`DIDAuthInitMessage sent to ${peerSocketId}`);
    }
}
