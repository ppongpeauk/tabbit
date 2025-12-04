import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";

/**
 * Hash an image file using SHA-256
 * @param imageUri - Local file URI of the image
 * @returns SHA-256 hash of the image file
 */
export async function hashImage(imageUri: string): Promise<string> {
  try {
    // Read the file as base64
    const file = new File(imageUri);
    const base64 = await file.base64();

    // Convert base64 to buffer-like data and hash it
    // Using the base64 string directly for hashing ensures consistency
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64
    );

    return hash;
  } catch (error) {
    throw new Error(
      `Failed to hash image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
