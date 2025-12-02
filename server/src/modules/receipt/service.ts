/**
 * @author Recipio Team
 * @description Receipt scanning service with OpenAI API integration
 */

import OpenAI from "openai";
import sharp from "sharp";
import type { Receipt, ReceiptResponse } from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";

const SYSTEM_PROMPT = `
You are a world-class receipt processing expert. Your task is to accurately extract information from a receipt image, including line item totals, and provide it in a structured JSON format.

IMPORTANT: First, determine if the image actually contains a receipt. A receipt should have:
- A merchant/store name
- Transaction details (date, time, or transaction ID)
- Line items with prices
- A total amount
- Payment information

If the image does NOT contain a receipt (e.g., it's a random photo, document, or unrelated image), return null for the receipt field.

IMPORTANT: For returnInfo.hasReturnBarcode, set this to true if you visually detect a barcode or QR code on the receipt (even if you cannot read its value). Set returnBarcode to the actual barcode value only if you can clearly read it from the image. If you see a barcode but cannot read it, set hasReturnBarcode to true and leave returnBarcode empty or omit it.

IMPORTANT: For merchant names, preserve the original casing as it appears on the receipt. Do not convert to all uppercase unless the receipt itself displays it that way. For example, if the receipt shows "Target" use "Target", if it shows "TARGET" use "TARGET", and if it shows "Coffee Shop" use "Coffee Shop".

Here is an example of a desired JSON output when a receipt IS found:

\`\`\`json
{
  "receipt": {
    "id": "rcpt_123",
    "merchant": {
      "merchantId": "target",
      "name": "Target",
      "address": {
        "line1": "123 Main St",
        "city": "Fairfax",
        "state": "VA",
        "postalCode": "22030",
        "country": "US"
      },
      "phone": "(555) 123 4567",
      "receiptNumber": "A1B2C3"
    },
    "transaction": {
      "datetime": "2025-12-01T14:52:00-05:00",
      "timezone": "America/New_York",
      "transactionId": "TXN_987654",
      "registerId": "REG_04",
      "cashierId": "CASH_12",
      "paymentMethod": "VISA •••• 1234",
      "paymentDetails": {
        "cardType": "Credit",
        "last4": "1234",
        "network": "VISA",
        "authCode": "A123BC"
      }
    },
    "items": [
      {
        "id": "item_1",
        "name": "Milk 2%",
        "sku": "MILK2",
        "category": "Groceries",
        "quantity": 1,
        "unitPrice": 3.49,
        "totalPrice": 3.49
      },
      {
        "id": "item_2",
        "name": "Eggs 12ct",
        "sku": "EGG12",
        "category": "Groceries",
        "quantity": 1,
        "unitPrice": 4.29,
        "totalPrice": 4.29
      }
    ],
    "totals": {
      "currency": "USD",
      "subtotal": 7.78,
      "tax": 0.62,
      "taxBreakdown": [
        {
          "label": "Sales tax",
          "amount": 0.62
        }
      ],
      "total": 8.4,
      "amountPaid": 8.4,
      "changeDue": 0
    },
    "returnInfo": {
      "returnPolicyText": "Returns accepted within 30 days with receipt.",
      "returnByDate": "2026-01-01",
      "returnBarcode": "1234567890",
      "hasReturnBarcode": true
    },
    "appData": {
      "tags": ["groceries", "personal"],
      "userNotes": "Weekly grocery run",
      "images": [
        {
          "url": "https://example.com/receipts/rcpt_123/original.jpg",
          "type": "original"
        }
      ]
    },
    "technical": {
      "source": "scan",
      "originalImage": {
        "url": "https://example.com/receipts/rcpt_123/original.jpg",
        "width": 1080,
        "height": 1920
      },
      "merchantDetectionConfidence": 0.96
    }
  }
}
\`\`\`

Here is an example when NO receipt is detected:

\`\`\`json
{
  "receipt": null
}
\`\`\`

Please extract the information from the receipt image and provide it in the following JSON schema. The receipt field should be null if no receipt is detected:

\`\`\`json
{
  "receipt": {json_schema_content} | null
}
\`\`\`
`;

const USER_PROMPT = "Extract the following.";

export class ReceiptService {
  private openai: OpenAI;
  private defaultModel: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required. Set it in your .env file."
      );
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    this.defaultModel =
      process.env.OPENAI_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  }

  /**
   * Encode image buffer to base64 string
   */
  private encodeImageToBase64(
    imageBuffer: Buffer,
    maxSize: number = 2048
  ): string {
    // For now, we'll use the buffer directly
    // In production, you might want to resize the image using sharp or similar
    return imageBuffer.toString("base64");
  }

  /**
   * Parse JSON response from OpenAI, handling code blocks
   * Returns either { receipt: Receipt | null } or { error: string, raw_response: string }
   */
  private parseJsonResponse(
    response: string
  ): { receipt?: Receipt | null } | { error: string; raw_response: string } {
    let cleaned = response.trim();

    // Remove code block markers if present
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    try {
      const parsed = JSON.parse(cleaned);
      // Handle both formats: { receipt: ... } or direct receipt object (for backward compatibility)
      return parsed;
    } catch (error) {
      return {
        error: `Failed to parse JSON response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        raw_response: response,
      };
    }
  }

  /**
   * Preprocess image buffer (resize if needed)
   * Resizes image to max height of 1280px while maintaining aspect ratio
   */
  private async preprocessImage(
    imageBuffer: Buffer,
    maxHeight: number = 1280
  ): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Only resize if height exceeds maxHeight
      if (metadata.height && metadata.height > maxHeight) {
        const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
        const newWidth = Math.round(maxHeight * aspectRatio);

        console.log(
          `[ReceiptService] Resizing image from ${metadata.width}x${metadata.height} to ${newWidth}x${maxHeight}`
        );

        const resizedBuffer = await image
          .resize(newWidth, maxHeight, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .toBuffer();

        return resizedBuffer;
      }

      // Return original if no resize needed
      return imageBuffer;
    } catch (error) {
      console.warn(
        "[ReceiptService] Failed to preprocess image, using original:",
        error
      );
      // Return original buffer if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Process a receipt image and extract structured data
   */
  async scanReceipt(
    imageBuffer: Buffer,
    options: {
      model?: string;
      jsonSchema?: Record<string, unknown>;
      skipPreprocessing?: boolean;
    } = {}
  ): Promise<ReceiptResponse> {
    try {
      const {
        model = this.defaultModel,
        jsonSchema = {},
        skipPreprocessing = false,
      } = options;

      // STEP 1: Preprocess/resize image FIRST (before any other processing)
      // This ensures all downstream operations (barcode detection, LLM) use the resized image
      let processedImage = imageBuffer;
      if (!skipPreprocessing) {
        processedImage = await this.preprocessImage(imageBuffer);
        console.log(
          `[ReceiptService] Image preprocessing complete: ${imageBuffer.length} bytes -> ${processedImage.length} bytes`
        );
      }

      // STEP 2: Detect barcodes using the preprocessed/resized image
      let barcodes: Array<{ type: string; content: string }> = [];
      try {
        barcodes = await detectBarcodes(processedImage);
        console.log("[ReceiptService] Barcode detection successful:", barcodes);
      } catch (error) {
        console.warn("[ReceiptService] Barcode detection failed:", error);
        // Continue with receipt scanning even if barcode detection fails
      }

      // STEP 3: Encode preprocessed image to base64 for LLM
      const imageBase64 = this.encodeImageToBase64(processedImage);

      // Prepare system prompt with JSON schema
      // Wrap the schema in a receipt object that can be null
      const receiptSchema = {
        receipt: {
          ...jsonSchema,
          type: "object",
        },
      };
      const systemPrompt = SYSTEM_PROMPT.replace(
        "{json_schema_content}",
        JSON.stringify(jsonSchema, null, 2)
      );

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          message: "No content received from OpenAI API",
        };
      }

      // Debug: Print LLM output JSON
      console.log("[ReceiptService] LLM Raw Output:");
      console.log(content);
      console.log("---");

      // Parse response
      const parsed = this.parseJsonResponse(content);

      // Debug: Print parsed JSON
      console.log("[ReceiptService] Parsed JSON:");
      console.log(JSON.stringify(parsed, null, 2));
      console.log("---");

      if ("error" in parsed) {
        return {
          success: false,
          message: parsed.error,
          raw_response: parsed.raw_response,
          usage: {
            completion_tokens: response.usage?.completion_tokens ?? 0,
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            total_tokens: response.usage?.total_tokens ?? 0,
          },
        };
      }

      // Check if receipt is null (no receipt detected)
      // Handle both formats: { receipt: Receipt | null } or direct Receipt object (backward compatibility)
      const parsedObj = parsed as { receipt?: Receipt | null } & Receipt;

      // Check if the response has a receipt property (new format)
      if ("receipt" in parsedObj) {
        if (parsedObj.receipt === null || parsedObj.receipt === undefined) {
          return {
            success: false,
            message:
              "No receipt detected in the image. Please ensure the image contains a clear, readable receipt.",
            usage: {
              completion_tokens: response.usage?.completion_tokens ?? 0,
              prompt_tokens: response.usage?.prompt_tokens ?? 0,
              total_tokens: response.usage?.total_tokens ?? 0,
            },
          };
        }
        // Validate that receipt is actually a Receipt object
        if (
          typeof parsedObj.receipt !== "object" ||
          !("merchant" in parsedObj.receipt)
        ) {
          return {
            success: false,
            message:
              "Invalid receipt data received. Please try again with a clearer image.",
            usage: {
              completion_tokens: response.usage?.completion_tokens ?? 0,
              prompt_tokens: response.usage?.prompt_tokens ?? 0,
              total_tokens: response.usage?.total_tokens ?? 0,
            },
          };
        }
        // Use the receipt from the new format
        const receiptData = parsedObj.receipt as Receipt;

        // Preserve LLM's hasReturnBarcode value - don't overwrite it
        // The LLM may set hasReturnBarcode to true even if returnBarcode is empty
        // (when it sees a barcode but can't read it)
        // Only set it if LLM didn't set it and returnBarcode exists
        if (receiptData.returnInfo) {
          if (
            receiptData.returnInfo.hasReturnBarcode === undefined &&
            receiptData.returnInfo.returnBarcode &&
            receiptData.returnInfo.returnBarcode.trim().length > 0
          ) {
            receiptData.returnInfo.hasReturnBarcode = true;
          }
        }

        // Ensure appData exists (LLM should have set emoji, but ensure structure exists)
        if (!receiptData.appData) {
          receiptData.appData = {};
        }

        // Debug: Log the hasReturnBarcode value before returning
        console.log(
          "[ReceiptService] Returning receipt with hasReturnBarcode:",
          receiptData.returnInfo?.hasReturnBarcode,
          "returnBarcode:",
          receiptData.returnInfo?.returnBarcode
        );

        return {
          success: true,
          receipt: receiptData,
          barcodes: barcodes.length > 0 ? barcodes : undefined,
          usage: {
            completion_tokens: response.usage?.completion_tokens ?? 0,
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            total_tokens: response.usage?.total_tokens ?? 0,
          },
        };
      }

      // Backward compatibility: treat parsed as direct Receipt object
      const receiptData = parsed as Receipt;
      if (
        !receiptData ||
        typeof receiptData !== "object" ||
        !("merchant" in receiptData)
      ) {
        return {
          success: false,
          message:
            "No receipt detected in the image. Please ensure the image contains a clear, readable receipt.",
          usage: {
            completion_tokens: response.usage?.completion_tokens ?? 0,
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            total_tokens: response.usage?.total_tokens ?? 0,
          },
        };
      }

      // Preserve LLM's hasReturnBarcode value - don't overwrite it
      // The LLM may set hasReturnBarcode to true even if returnBarcode is empty
      // (when it sees a barcode but can't read it)
      // Only set it if LLM didn't set it and returnBarcode exists
      if (receiptData.returnInfo) {
        if (
          receiptData.returnInfo.hasReturnBarcode === undefined &&
          receiptData.returnInfo.returnBarcode &&
          receiptData.returnInfo.returnBarcode.trim().length > 0
        ) {
          receiptData.returnInfo.hasReturnBarcode = true;
        }
      }

      // Ensure appData exists (LLM should have set emoji, but ensure structure exists)
      if (!receiptData.appData) {
        receiptData.appData = {};
      }

      // Debug: Log the hasReturnBarcode value before returning
      console.log(
        "[ReceiptService] Returning receipt (backward compat) with hasReturnBarcode:",
        receiptData.returnInfo?.hasReturnBarcode,
        "returnBarcode:",
        receiptData.returnInfo?.returnBarcode
      );

      return {
        success: true,
        receipt: receiptData as Receipt,
        barcodes: barcodes.length > 0 ? barcodes : undefined,
        usage: {
          completion_tokens: response.usage?.completion_tokens ?? 0,
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        error: error instanceof Error ? error.stack : undefined,
      };
    }
  }
}

export const receiptService = new ReceiptService();
