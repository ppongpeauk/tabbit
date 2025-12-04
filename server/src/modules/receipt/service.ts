/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt scanning service using OpenAI vision models
 */

import OpenAI from "openai";
import sharp from "sharp";
import type { Receipt, ReceiptResponse } from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";
import { cacheService } from "../../utils/cache";
import { hashBuffer, hashString } from "../../utils/helpers";
import { CACHE_TTL } from "../../utils/constants";
import { env } from "../../config/env";

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

IMPORTANT: For returnInfo.returnPolicyText, return it as an array of strings where each string represents a single bullet point. Each bullet point should be:
- Clear: Easy to understand at a glance
- Concise: Remove unnecessary words, keep only essential information
- Easy to read: Use active voice when possible, make each point actionable and scannable

Extract each distinct return/refund policy statement as a separate array element. Rewrite and simplify the language from the receipt to make it clearer and more concise while preserving the essential meaning. Remove redundant phrases, combine related information, and ensure each bullet point stands alone as a complete thought. Also include returnPolicyRawText with the original raw text exactly as it appears on the receipt.

For example, if the receipt says "Returns accepted within 30 days with receipt. Items must be in original packaging. No returns on sale items.", format it as:
returnPolicyText: ["Returns accepted within 30 days with receipt", "Items must be in original packaging", "No returns on sale items"]
returnPolicyRawText: "Returns accepted within 30 days with receipt. Items must be in original packaging. No returns on sale items."

Another example: if the receipt says "You may return any item purchased from our store within 14 days of the purchase date, provided that the item is in its original condition and packaging, and you have the original receipt or proof of purchase.", format it as:
returnPolicyText: ["Returns accepted within 14 days of purchase", "Item must be in original condition and packaging", "Original receipt or proof of purchase required"]
returnPolicyRawText: "You may return any item purchased from our store within 14 days of the purchase date, provided that the item is in its original condition and packaging, and you have the original receipt or proof of purchase."

IMPORTANT: For returnInfo.returnByDate and returnInfo.exchangeByDate:
- If the receipt explicitly states a return/exchange deadline date, extract it and format as YYYY-MM-DD
- If the receipt states a timespan (e.g., "30 days", "14 days", "within 90 days"), calculate the date by adding that timespan to the transaction.datetime date
- For returnByDate: Calculate from the purchase date if policy mentions "X days from purchase" or "within X days"
- For exchangeByDate: Calculate from the purchase date if policy mentions "X days for exchange" or "exchange within X days"
- Always use the transaction.datetime as the base date for calculations
- If no return/exchange policy is mentioned or no timespan can be determined, omit the respective date field

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
      "returnPolicyText": ["Returns accepted within 30 days with receipt", "Items must be in original packaging", "No returns on sale items"],
      "returnPolicyRawText": "Returns accepted within 30 days with receipt. Items must be in original packaging. No returns on sale items.",
      "returnByDate": "2026-01-01",
      "exchangeByDate": "2026-01-15",
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

const USER_PROMPT = "Extract the following";

type ReceiptExtractionResult =
  | ReceiptResponse
  | {
      success: true;
      receipt: Receipt;
      usage: ReturnType<ReceiptService["extractUsage"]>;
    };

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
  private encodeImageToBase64(imageBuffer: Buffer): string {
    return imageBuffer.toString("base64");
  }

  /**
   * Normalize return info barcode flag
   * Preserves LLM's hasReturnBarcode value - only sets it if undefined and returnBarcode exists
   */
  private normalizeReturnBarcode(receipt: Receipt): void {
    if (receipt.returnInfo) {
      if (
        receipt.returnInfo.hasReturnBarcode === undefined &&
        receipt.returnInfo.returnBarcode &&
        receipt.returnInfo.returnBarcode.trim().length > 0
      ) {
        receipt.returnInfo.hasReturnBarcode = true;
      }
    }
  }

  /**
   * Ensure appData structure exists
   */
  private ensureAppData(receipt: Receipt): void {
    if (!receipt.appData) {
      receipt.appData = {};
    }
  }

  /**
   * Extract usage information from OpenAI response
   */
  private extractUsage(usage: OpenAI.Completions.CompletionUsage | undefined) {
    return {
      completion_tokens: usage?.completion_tokens ?? 0,
      prompt_tokens: usage?.prompt_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
    };
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
   * Generate cache key for receipt scan
   */
  private generateCacheKey(imageHash: string, promptHash: string): string {
    return `receipt:scan:${imageHash}:${promptHash}`;
  }

  /**
   * Extract receipt data from parsed LLM response
   * Handles both { receipt: Receipt | null } and direct Receipt object formats
   */
  private extractReceiptFromResponse(
    parsed:
      | { receipt?: Receipt | null }
      | { error: string; raw_response: string }
      | Receipt,
    usage: OpenAI.Completions.CompletionUsage | undefined
  ): ReceiptExtractionResult {
    // Handle error case
    if ("error" in parsed) {
      return {
        success: false,
        message: parsed.error,
        raw_response: parsed.raw_response,
        usage: this.extractUsage(usage),
      };
    }

    const parsedObj = parsed as { receipt?: Receipt | null } & Receipt;
    let receiptData: Receipt | null = null;

    // Check if the response has a receipt property (new format)
    if ("receipt" in parsedObj) {
      if (parsedObj.receipt === null || parsedObj.receipt === undefined) {
        return {
          success: false,
          message:
            "No receipt detected in the image. Please ensure the image contains a clear, readable receipt.",
          usage: this.extractUsage(usage),
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
          usage: this.extractUsage(usage),
        };
      }
      receiptData = parsedObj.receipt as Receipt;
    } else {
      // Backward compatibility: treat parsed as direct Receipt object
      const directReceipt = parsed as Receipt;
      if (
        !directReceipt ||
        typeof directReceipt !== "object" ||
        !("merchant" in directReceipt)
      ) {
        return {
          success: false,
          message:
            "No receipt detected in the image. Please ensure the image contains a clear, readable receipt.",
          usage: this.extractUsage(usage),
        };
      }
      receiptData = directReceipt;
    }

    return {
      success: true,
      receipt: receiptData,
      usage: this.extractUsage(usage),
    };
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
      }

      // STEP 3: Generate cache key
      const imageHash = hashBuffer(processedImage);
      const systemPrompt = SYSTEM_PROMPT.replace(
        "{json_schema_content}",
        JSON.stringify(jsonSchema, null, 2)
      );
      const promptContent = `${systemPrompt}${USER_PROMPT}${JSON.stringify(
        jsonSchema
      )}${model}`;
      const promptHash = hashString(promptContent);

      const cacheKey = this.generateCacheKey(imageHash, promptHash);

      // STEP 4: Check cache before calling LLM (if caching is enabled)
      if (!env.DISABLE_IMAGE_CACHE) {
        const cachedResult = await cacheService.get<ReceiptResponse>(cacheKey);
        if (cachedResult) {
          console.log(`[ReceiptService] Cache hit for key: ${cacheKey}`);
          return {
            ...cachedResult,
            barcodes: barcodes.length > 0 ? barcodes : cachedResult.barcodes,
          };
        }

        console.log(
          `[ReceiptService] Cache miss for key: ${cacheKey}, calling LLM`
        );
      } else {
        console.log(`[ReceiptService] Image caching disabled, calling LLM`);
      }

      // STEP 5: Encode preprocessed image to base64 for LLM
      const imageBase64 = this.encodeImageToBase64(processedImage);

      // STEP 6: Call OpenAI API
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

      const parsed = this.parseJsonResponse(content);

      const receiptData = this.extractReceiptFromResponse(
        parsed,
        response.usage
      );
      if (!receiptData.success) {
        return receiptData;
      }

      if (!receiptData.receipt) {
        return {
          success: false,
          message: "No receipt data available",
        };
      }

      this.normalizeReturnBarcode(receiptData.receipt);
      this.ensureAppData(receiptData.receipt);

      const result: ReceiptResponse = {
        success: true,
        receipt: receiptData.receipt,
        barcodes: barcodes.length > 0 ? barcodes : undefined,
        usage: receiptData.usage,
      };

      // STEP 7: Cache the result with 1 day TTL (if caching is enabled)
      if (!env.DISABLE_IMAGE_CACHE) {
        await cacheService.set(cacheKey, result, CACHE_TTL.ONE_DAY);
        console.log(`[ReceiptService] Cached result for key: ${cacheKey}`);
      }

      return result;
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
