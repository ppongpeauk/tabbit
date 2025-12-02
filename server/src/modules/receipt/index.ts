/**
 * @author Recipio Team
 * @description Receipt scanning module routes and handlers
 */

import { Elysia, t } from "elysia";
import { receiptService } from "./service";
import { defaultReceiptSchema } from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";

export const receiptModule = new Elysia({ prefix: "/receipts" })
  .post(
    "/scan",
    async ({ body, set }) => {
      const { image, model, skip_preprocessing } = body;

      if (!image) {
        set.status = 400;
        return {
          success: false,
          message: "Image file is required",
        };
      }

      // Convert File to Buffer
      const arrayBuffer = await image.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Handle boolean conversion from multipart form data
      const skipPreprocessing =
        skip_preprocessing === true ||
        (typeof skip_preprocessing === "string" &&
          skip_preprocessing === "true");

      const result = await receiptService.scanReceipt(imageBuffer, {
        model,
        skipPreprocessing,
        jsonSchema: defaultReceiptSchema,
      });

      if (!result.success) {
        set.status = result.error ? 500 : 400;
        return result;
      }

      set.status = 200;
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
        set.status = 400;
        return {
          success: false,
          message: "image_base64 is required",
        };
      }

      // Convert base64 string to Buffer
      const imageBuffer = Buffer.from(image_base64, "base64");

      // Handle boolean conversion from multipart form data
      const skipPreprocessing =
        skip_preprocessing === true ||
        (typeof skip_preprocessing === "string" &&
          skip_preprocessing === "true");

      const result = await receiptService.scanReceipt(imageBuffer, {
        model,
        skipPreprocessing,
        jsonSchema: defaultReceiptSchema,
      });

      if (!result.success) {
        set.status = result.error ? 500 : 400;
        return result;
      }

      set.status = 200;
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
        set.status = 400;
        return {
          success: false,
          message: "Image file is required",
        };
      }

      // Convert File to Buffer
      const arrayBuffer = await image.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      try {
        const barcodes = await detectBarcodes(imageBuffer);

        set.status = 200;
        return {
          success: true,
          barcodes,
          count: barcodes.length,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to detect barcodes",
          error: error instanceof Error ? error.stack : undefined,
        };
      }
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
        set.status = 400;
        return {
          success: false,
          message: "image_base64 is required",
        };
      }

      // Convert base64 string to Buffer
      const imageBuffer = Buffer.from(image_base64, "base64");

      try {
        const barcodes = await detectBarcodes(imageBuffer);

        set.status = 200;
        return {
          success: true,
          barcodes,
          count: barcodes.length,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to detect barcodes",
          error: error instanceof Error ? error.stack : undefined,
        };
      }
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
