/**
 * @author Recipio Team
 * @description Receipt scanning module routes and handlers
 */

import { Elysia, t } from "elysia";
import { receiptService } from "./service";
import { defaultReceiptSchema } from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";
import { HTTP_STATUS } from "../../utils/constants";

/**
 * Convert skip_preprocessing parameter to boolean
 */
function parseSkipPreprocessing(
  value: string | boolean | undefined
): boolean {
  return value === true || (typeof value === "string" && value === "true");
}

/**
 * Convert File to Buffer
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert base64 string to Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

/**
 * Handle receipt scan request
 */
async function handleReceiptScan(
  imageBuffer: Buffer,
  model: string | undefined,
  skipPreprocessing: boolean
) {
  const result = await receiptService.scanReceipt(imageBuffer, {
    model,
    skipPreprocessing,
    jsonSchema: defaultReceiptSchema,
  });

  return {
    result,
    status: result.success ? HTTP_STATUS.OK : result.error ? HTTP_STATUS.INTERNAL_SERVER_ERROR : HTTP_STATUS.BAD_REQUEST,
  };
}

/**
 * Handle barcode scan request
 */
async function handleBarcodeScan(imageBuffer: Buffer) {
  try {
    const barcodes = await detectBarcodes(imageBuffer);
    return {
      success: true,
      barcodes,
      count: barcodes.length,
      status: HTTP_STATUS.OK,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to detect barcodes",
      error: error instanceof Error ? error.stack : undefined,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

export const receiptModule = new Elysia({ prefix: "/receipts" })
  .post(
    "/scan",
    async ({ body, set }) => {
      const { image, model, skip_preprocessing } = body;

      if (!image) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return {
          success: false,
          message: "Image file is required",
        };
      }

      const imageBuffer = await fileToBuffer(image);
      const skipPreprocessing = parseSkipPreprocessing(skip_preprocessing);
      const { result, status } = await handleReceiptScan(
        imageBuffer,
        model,
        skipPreprocessing
      );

      set.status = status;
      return result;
    },
    {
      body: t.Object({
        image: t.File({
          type: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        }),
        model: t.Optional(t.String()),
        skip_preprocessing: t.Optional(t.Union([t.String(), t.Boolean()])),
      }),
      detail: {
        tags: ["receipts"],
        summary: "Scan receipt image",
        description:
          "Extract structured data from a receipt image using OpenAI vision model",
        consumes: ["multipart/form-data"],
      },
    }
  )
  .post(
    "/scan-base64",
    async ({ body, set }) => {
      const { image_base64, model, skip_preprocessing } = body;

      if (!image_base64) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return {
          success: false,
          message: "image_base64 is required",
        };
      }

      const imageBuffer = base64ToBuffer(image_base64);
      const skipPreprocessing = parseSkipPreprocessing(skip_preprocessing);
      const { result, status } = await handleReceiptScan(
        imageBuffer,
        model,
        skipPreprocessing
      );

      set.status = status;
      return result;
    },
    {
      body: t.Object({
        image_base64: t.String(),
        model: t.Optional(t.String()),
        skip_preprocessing: t.Optional(t.Union([t.String(), t.Boolean()])),
      }),
      detail: {
        tags: ["receipts"],
        summary: "Scan receipt from base64",
        description:
          "Extract structured data from a base64-encoded receipt image",
        consumes: ["multipart/form-data"],
      },
    }
  )
  .post(
    "/barcodes/scan",
    async ({ body, set }) => {
      const { image } = body;

      if (!image) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return {
          success: false,
          message: "Image file is required",
        };
      }

      const imageBuffer = await fileToBuffer(image);
      const response = await handleBarcodeScan(imageBuffer);

      set.status = response.status;
      return response;
    },
    {
      body: t.Object({
        image: t.File({
          type: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        }),
      }),
      detail: {
        tags: ["barcodes"],
        summary: "Detect barcodes and QR codes in image",
        description:
          "Detect and decode barcodes and QR codes from an image file",
        consumes: ["multipart/form-data"],
      },
    }
  )
  .post(
    "/barcodes/scan-base64",
    async ({ body, set }) => {
      const { image_base64 } = body;

      if (!image_base64) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return {
          success: false,
          message: "image_base64 is required",
        };
      }

      const imageBuffer = base64ToBuffer(image_base64);
      const response = await handleBarcodeScan(imageBuffer);

      set.status = response.status;
      return response;
    },
    {
      body: t.Object({
        image_base64: t.String(),
      }),
      detail: {
        tags: ["barcodes"],
        summary: "Detect barcodes and QR codes from base64",
        description:
          "Detect and decode barcodes and QR codes from a base64-encoded image",
      },
    }
  );
