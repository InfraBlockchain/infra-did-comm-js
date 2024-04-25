export function unescape(str: string): string {
    return str.replace(/-/g, "+").replace(/_/g, "/");
}

export function escape(str: string): string {
    return str.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Deflates and encodes a JSON record into a base64url string.
 * @param jsonRecord The JSON record to deflate and encode.
 * @returns A Promise that resolves to the base64url encoded string.
 */
export function deflateAndEncode(jsonRecord: Record<string, any>): string {
    const jsonStr = JSON.stringify(jsonRecord);
    const utf8Bytes = Buffer.from(jsonStr, "utf-8");
    const base64Encoded = utf8Bytes.toString("base64");
    const base64UrlEncoded = escape(base64Encoded);

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
    const base64Encoded = unescape(base64UrlEncoded);
    const utf8Bytes = Buffer.from(base64Encoded, "base64");
    const jsonStr = utf8Bytes.toString("utf-8");
    const jsonRecord = JSON.parse(jsonStr);

    return jsonRecord;
}
