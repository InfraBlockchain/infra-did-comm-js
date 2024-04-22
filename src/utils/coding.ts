import { Buffer } from "buffer";

/**
 * Deflates and encodes a JSON record into a base64url string.
 * @param jsonRecord The JSON record to deflate and encode.
 * @returns A Promise that resolves to the base64url encoded string.
 */
export function deflateAndEncode(
    jsonRecord: Record<string, any>,
): string {
    const jsonStr = JSON.stringify(jsonRecord);
    const utf8Bytes = Buffer.from(jsonStr, "utf-8");
    const base64UrlEncoded = utf8Bytes.toString("base64url");

    return base64UrlEncoded;
}

/**
 * Inflates and decodes a base64url string into a JSON record.
 * @param base64UrlEncoded The base64url encoded string to inflate and decode.
 * @returns A Promise that resolves to the JSON record.
 */
export function inflateAndDecode(
    base64UrlEncoded: string,
): Record<string, any> {
    const utf8Bytes = Buffer.from(base64UrlEncoded, "base64url");
    const jsonStr = utf8Bytes.toString("utf-8");
    const jsonRecord = JSON.parse(jsonStr);

    return jsonRecord;
}
