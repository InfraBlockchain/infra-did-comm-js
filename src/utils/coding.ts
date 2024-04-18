import { promisify } from "util";
import * as zlib from "zlib";

const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

/**
 * Deflates and encodes a JSON record into a base64url string.
 * @param jsonRecord The JSON record to deflate and encode.
 * @returns A Promise that resolves to the base64url encoded string.
 */
export async function deflateAndEncode(
    jsonRecord: Record<string, any>,
): Promise<string> {
    const jsonStr = JSON.stringify(jsonRecord);
    const utf8Bytes = Buffer.from(jsonStr, "utf-8");
    const deflatedBytes = await deflate(utf8Bytes);
    const base64UrlEncoded = deflatedBytes.toString("base64url");

    return base64UrlEncoded;
}

/**
 * Inflates and decodes a base64url string into a JSON record.
 * @param base64UrlEncoded The base64url encoded string to inflate and decode.
 * @returns A Promise that resolves to the JSON record.
 */
export async function inflateAndDecode(
    base64UrlEncoded: string,
): Promise<Record<string, any>> {
    const deflatedBytes = Buffer.from(base64UrlEncoded, "base64url");
    const utf8Bytes = await inflate(deflatedBytes);
    const jsonStr = utf8Bytes.toString("utf-8");
    const jsonRecord = JSON.parse(jsonStr);

    return jsonRecord;
}
