/**
 * @author Recipio Team
 * @description Barcode and QR code detection utility using zxing-wasm
 */

import { readBarcodes, type ReaderOptions } from "zxing-wasm/reader";

export interface DetectedBarcode {
  type: string;
  content: string;
}

/**
 * Detect barcodes and QR codes from an image buffer
 */
export async function detectBarcodes(
  imageBuffer: Buffer
): Promise<DetectedBarcode[]> {
  try {
    console.log(
      `[BarcodeDetector] Processing image buffer: ${imageBuffer.length} bytes`
    );

    // Configure reader options to detect all supported formats
    const readerOptions: ReaderOptions = {
      tryHarder: true,
      formats: [
        "QRCode",
        "DataMatrix",
        "Aztec",
        "PDF417",
        "Code128",
        "Code39",
        "Code93",
        "EAN-13",
        "EAN-8",
        "ITF",
        "Codabar",
        "UPC-A",
        "UPC-E",
        "DataBar",
        "DataBarExpanded",
        "DataBarLimited",
      ],
    };

    // Read barcodes from the image buffer
    // Buffer extends Uint8Array, so it's compatible with readBarcodes
    const results = await readBarcodes(imageBuffer, readerOptions);

    const detectedBarcodes: DetectedBarcode[] = results.map((result) => ({
      type: normalizeFormatName(result.format),
      content: result.text,
    }));

    if (detectedBarcodes.length === 0) {
      console.log("[BarcodeDetector] No barcodes detected in image");
    } else {
      console.log(
        `[BarcodeDetector] Successfully detected ${detectedBarcodes.length} barcode(s)`
      );
      detectedBarcodes.forEach((barcode) => {
        console.log(
          `[BarcodeDetector] Detected ${barcode.type}: ${barcode.content}`
        );
      });
    }

    return detectedBarcodes;
  } catch (error) {
    console.error("[BarcodeDetector] Failed to detect barcodes:", error);
    if (error instanceof Error) {
      console.error("[BarcodeDetector] Error stack:", error.stack);
    }
    return [];
  }
}

/**
 * Normalize format name from zxing-wasm to match expected format
 * Converts format names like "QRCode" to "QR_CODE"
 */
function normalizeFormatName(format: string): string {
  // Map zxing-wasm format names to our expected format names
  const formatMap: Record<string, string> = {
    QRCode: "QR_CODE",
    MicroQRCode: "MICRO_QR_CODE",
    rMQRCode: "RMQR_CODE",
    DataMatrix: "DATA_MATRIX",
    Aztec: "AZTEC",
    PDF417: "PDF_417",
    Code128: "CODE_128",
    Code39: "CODE_39",
    Code93: "CODE_93",
    "EAN-13": "EAN_13",
    "EAN-8": "EAN_8",
    ITF: "ITF",
    Codabar: "CODABAR",
    "UPC-A": "UPC_A",
    "UPC-E": "UPC_E",
    DataBar: "DATA_BAR",
    DataBarExpanded: "DATA_BAR_EXPANDED",
    DataBarLimited: "DATA_BAR_LIMITED",
    DXFilmEdge: "DX_FILM_EDGE",
    MaxiCode: "MAXI_CODE",
  };

  return formatMap[format] || format.toUpperCase().replace(/-/g, "_");
}
