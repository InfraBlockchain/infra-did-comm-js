import axios from "axios";

import { CompressionLevel, DIDConnectRequestMessage } from "../messages";
import { Context, Initiator } from "../messages/commons";
import { sleep } from "../utils/functions";
import { InfraDIDCommAgent } from "./index";

/**
 * Continuously attempts to establish a DID connection by sending connect request messages until a connection is established.
 *
 * This function enters a loop that continues until `agent.isDIDConnected` becomes true. In each iteration, it disconnects and reconnects the agent,
 * then sends a DID connect request message. The loop includes delays to manage timing and pacing of operations.
 *
 * @param {InfraDIDCommAgent} agent - The DIDComm socket agent instance used to manage connections.
 * @param {Context} context - The context for the DID connect request, containing necessary metadata.
 * @param {number} timeout - The timeout in seconds for the connect request. Also used as a delay before the next iteration.
 * @param {(message: string) => void} callback - A callback function that is called with the encoded connect request message.
 */
export async function connectRequestDynamic(
    agent: InfraDIDCommAgent,
    context: Context,
    timeout: number,
    callback: (message: string) => void,
) {
    while (!agent.isReceivedDIDAuthInit) {
        await sleep(100);
        agent.disconnect();
        await sleep(100);
        agent.connect();

        const currentTime = Math.floor(Date.now() / 1000);
        await sleep(500);

        const message = await createConnectRequestMessage(
            agent,
            currentTime,
            context,
        );
        const encodedMessage = message.encode(CompressionLevel.RAW);
        callback(encodedMessage);

        await sleep(timeout * 1000);
    }
}

export async function connectRequestStatic(
    agent: InfraDIDCommAgent,
    serviceEndpoint: string,
    context: Context,
    verifierDID?: string,
) {
    try {
        await agent.init();

        if (verifierDID) {
            agent.didVerifyCallback(verifierDID);
        }

        const currentTime = Math.floor(Date.now() / 1000);
        await sleep(500);

        const message = await createConnectRequestMessage(
            agent,
            currentTime,
            context,
        );
        const encodedMessage = message.encode(CompressionLevel.RAW);

        const url = `${serviceEndpoint}?data=${encodedMessage}`;
        const response = await axios.get(url);
        console.log("Static connect request response: ", response.data);
    } catch (error) {
        throw new Error(`Failed to connectRequestStatic: ${error}`);
    }
}

export async function createConnectRequestMessage(
    agent: InfraDIDCommAgent,
    currentTime: number,
    context: Context,
): Promise<DIDConnectRequestMessage> {
    const initiator = new Initiator({
        type: agent.role,
        serviceEndpoint: agent.url,
        socketId: await agent.socketId,
    });
    return new DIDConnectRequestMessage(
        agent.did,
        currentTime,
        currentTime + 30000,
        initiator,
        context,
    );
}
