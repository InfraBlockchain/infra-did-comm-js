import { CompressionLevel } from "@src/messages";
import { Context } from "@src/messages/commons";
import { InfraDIDCommSocketClient } from "@src/websocket/index";

/**
 * Continuously attempts to establish a DID connection by sending connect request messages until a connection is established.
 *
 * This function enters a loop that continues until `client.isDIDConnected` becomes true. In each iteration, it disconnects and reconnects the client,
 * then sends a DID connect request message. The loop includes delays to manage timing and pacing of operations.
 *
 * @param {InfraDIDCommSocketClient} client - The DIDComm socket client instance used to manage connections.
 * @param {Context} context - The context for the DID connect request, containing necessary metadata.
 * @param {number} timeout - The timeout in seconds for the connect request. Also used as a delay before the next iteration.
 * @param {(message: string) => void} callback - A callback function that is called with the encoded connect request message.
 */
export async function didConnectRequest(
    client: InfraDIDCommSocketClient,
    context: Context,
    timeout: number,
    callback: (message: string) => void,
) {
    while (!client.isReceivedDIDAuthInit) {
        // Disconnect and reconnect the client with a brief pause in between
        await sleep(100);
        client.disconnect();
        await sleep(100);
        client.connect();

        // Calculate the current time in seconds
        const currentTime = Math.floor(Date.now() / 1000);
        // Introduce a short delay before proceeding
        await sleep(500);

        // Create a new DID connect request message
        const message = await client.create_connect_request_message(
            currentTime,
            timeout,
            context,
        );
        // Encode the message with the specified compression level
        const encodedMessage = await message.encode(CompressionLevel.RAW);
        // Invoke the callback with the encoded message
        callback(encodedMessage);

        // Wait for the specified timeout before the next iteration
        await sleep(timeout * 1000);
    }
}

/**
 * Pauses execution for a specified amount of time.
 *
 * @param {number} time - The duration of the pause.
 * @param {'ms' | 's'} unit - The unit of time for the duration ('ms' for milliseconds, 's' for seconds). Defaults to 'ms'.
 * @returns {Promise<void>} A promise that resolves after the specified duration.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
