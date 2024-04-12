import { promisify } from "util";
import * as zlib from "zlib";

// Promisify the zlib methods for use with async/await
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

export async function deflateAndEncode(
    data: Record<string, any>,
): Promise<string> {
    const jsonString = JSON.stringify(data);
    const dataBytes = Buffer.from(jsonString, "utf-8");

    // Deflate data
    const deflatedData = await deflate(dataBytes);

    // Encode deflated data to base64Url
    const encoded = deflatedData.toString("base64url");
    return encoded;
}

export async function inflateAndDecode(
    encoded: string,
): Promise<Record<string, any>> {
    // Decode base64Url to deflated data
    const deflatedData = Buffer.from(encoded, "base64url");

    // Inflate data
    const inflatedData = await inflate(deflatedData);

    // Decode utf-8 to jsonString
    const jsonString = inflatedData.toString("utf-8");
    const data = JSON.parse(jsonString);
    return data;
}
