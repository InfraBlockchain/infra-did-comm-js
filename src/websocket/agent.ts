import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// 메세지 index 통합 정리
import {
    DIDAuthInitMessage,
    DIDConnectRequestMessage,
    VPReqRejectMessage,
} from "../../src/messages";
import { Context } from "../../src/messages/commons";
// 메세지 index 통합 정리
import { VPReqMessage } from "../messages/vp/vp-req";
import { VPSubmitMessage } from "../messages/vp/vp-submit";
import {
    messageHandler,
    sendDIDAuthInitMessageToReceiver,
    sendJWE,
    VCRequirement,
} from "./message-handler";

import { cryptoWaitReady } from "@polkadot/util-crypto";
import { CRYPTO_INFO, InfraSS58 } from "infra-did-js";
import { connectRequestDynamic, connectRequestStatic } from "./connect-request";

export class InfraDIDCommAgent {
    did: string;
    mnemonic: string;
    role: string = "HOLDER";
    url: string;
    domain: string;

    socket: Socket;
    peerInfo: { [key: string]: string } = {}; // Peers' info {did, socketId}

    isDIDConnected: boolean = false;
    isDIDVerified: boolean = false;
    isReceivedDIDAuthInit: boolean = false;

    // VP related
    // TODO: find a better idea to store VPReqChallenge and domain
    VPReqChallenge: string = "";
    VCRequirements: VCRequirement[];
    infraApi: InfraSS58;
    didChainEndpoint = "";

    /* eslint-disable @typescript-eslint/no-unused-vars */
    didAuthCallback: (peerDID: string) => boolean = peerDID => true;
    didConnectedCallback: (peerDID: string) => void = peerDID => {};
    didAuthFailedCallback: (peerDID: string) => void = peerDID => {};
    didVerifyCallback: (peerDID: string) => boolean = peerDID => true;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    private _socketIdPromiseResolver: (value: string) => void;
    socketId: Promise<string>;

    constructor(
        url: string,
        did: string,
        mnemonic: string,
        role: string,
        didChainEndpoint: string,
    ) {
        this.url = url;
        this.did = did;
        this.mnemonic = mnemonic;
        this.didChainEndpoint = didChainEndpoint;
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

    async init(): Promise<void> {
        this.connect();
        await this.setupInfraApi();
    }

    private async setupInfraApi(): Promise<void> {
        await cryptoWaitReady();
        const txfeePayerAccountKeyPair = await InfraSS58.getKeyringPairFromUri(
            this.mnemonic,
            "sr25519",
        );
        const edKeyPair = await InfraSS58.getKeyringPairFromUri(
            this.mnemonic,
            "ed25519",
        );
        const networkId = "01";
        const confBlockchainNetwork = {
            networkId,
            address: this.didChainEndpoint,
            txfeePayerAccountKeyPair,
        };

        const conf = {
            ...confBlockchainNetwork,
            did: this.did,
            keyPair: edKeyPair,
            controllerDID: this.did,
            controllerKeyPair: edKeyPair,
            cryptoInfo: CRYPTO_INFO.ED25519_2018,
        };

        this.infraApi = await InfraSS58.createAsync(conf);
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

            // save domain
            this.domain = didConnectRequestMessage.body.context.domain;

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

    async sendVPSubmit(VP: string): Promise<void> {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const id = uuidv4();

            if (this.VPReqChallenge === "") {
                throw new Error(
                    `There is no received VPReq message from ${this.peerInfo.did}`,
                );
            }

            const vpSubmitMessage = new VPSubmitMessage(
                id,
                this.did,
                [this.peerInfo.did],
                currentTime,
                currentTime + 30000,
                VP,
            );

            await sendJWE(this.mnemonic, vpSubmitMessage, this);

            console.log(
                `VPSubmitMessage sent to ${this.peerInfo.peerSocketId}, message: ${vpSubmitMessage}`,
            );
        } catch (error) {
            throw new Error(`Failed to sendDIDAuthInitMessage: ${error}`);
        }
    }

    async sendVPReq(VCRequirements: VCRequirement[]): Promise<void> {
        try {
            this.VCRequirements = VCRequirements;
            const currentTime = Math.floor(Date.now() / 1000);
            const id = uuidv4();

            const vpReqMessage = new VPReqMessage(
                id,
                this.did,
                [this.peerInfo.did],
                currentTime,
                currentTime + 30000,
                VCRequirements,
                this.infraApi.getChallenge(),
            );

            await sendJWE(this.mnemonic, vpReqMessage, this);

            console.log(
                `VPReqMessage sent to ${this.peerInfo.peerSocketId}, message: ${vpReqMessage}`,
            );
        } catch (error) {
            throw new Error(`Failed to sendDIDAuthInitMessage: ${error}`);
        }
    }

    async sendVPReqReject(reason: string): Promise<void> {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const id = uuidv4();

            const vpReqRejectMessage = new VPReqRejectMessage(
                id,
                this.did,
                [this.peerInfo.did],
                currentTime,
                currentTime + 30000,
                reason,
            );

            await sendJWE(this.mnemonic, vpReqRejectMessage, this);

            console.log(
                `VPReqRejectMessage sent to ${this.peerInfo.peerSocketId}, message: ${vpReqRejectMessage}`,
            );
        } catch (error) {
            throw new Error(`Failed to sendVPReqRejectMessage: ${error}`);
        }
    }
}
