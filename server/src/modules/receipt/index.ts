/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt scanning and barcode detection routes
 */

import { Elysia, t } from "elysia";
import { receiptService } from "./service";
import { defaultReceiptSchema, storedReceiptDataSchema } from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";
import { HTTP_STATUS } from "../../utils/constants";
import { errorResponse } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

/**
 * Convert skip_preprocessing parameter to boolean
 */
function parseSkipPreprocessing(value: string | boolean | undefined): boolean {
  return value === true || (typeof value === "string" && value === "true");
}

/**
 * Convert File to Buffer
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
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
): Promise<{ success: boolean; [key: string]: unknown; status: number }> {
  const result = await receiptService.scanReceipt(imageBuffer, {
    model,
    skipPreprocessing,
    jsonSchema: defaultReceiptSchema,
  });

  const status = result.success
    ? HTTP_STATUS.OK
    : result.error
    ? HTTP_STATUS.INTERNAL_SERVER_ERROR
    : HTTP_STATUS.BAD_REQUEST;

  return { ...result, status };
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
        error instanceof Error ? error.message : "Failed to detect barcodes",
      error: error instanceof Error ? error.stack : undefined,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }
}

/**
 * Process image from file or base64 and execute handler
 */
async function processImage<T extends { status?: number }>(
  image: File | undefined,
  imageBase64: string | undefined,
  handler: (buffer: Buffer) => Promise<T>
): Promise<{
  response: T | { success: false; message: string };
  status: number;
}> {
  let imageBuffer: Buffer;

  if (image) {
    imageBuffer = await fileToBuffer(image);
  } else if (imageBase64) {
    imageBuffer = base64ToBuffer(imageBase64);
  } else {
    const message = imageBase64
      ? "Image file is required"
      : "image_base64 is required";
    const { status } = errorResponse(message);
    return {
      response: { success: false as const, message },
      status,
    };
  }

  const result = await handler(imageBuffer);
  const status = result.status ?? HTTP_STATUS.OK;
  return { response: result, status };
}

export const receiptModule = new Elysia({ prefix: "/receipts" })
  .derive(async ({ request }) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      return { user: session?.user || null };
    } catch {
      return { user: null };
    }
  })
  .post(
    "/scan",
    async ({ body, set, user }) => {
      const { image, model, skip_preprocessing } = body;
      const skipPreprocessing = parseSkipPreprocessing(skip_preprocessing);

      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      const processed = await processImage(image, undefined, async (buffer) =>
        handleReceiptScan(buffer, model, skipPreprocessing)
      );

      set.status = processed.status;
      return processed.response;
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
    async ({ body, set, user }) => {
      const { image_base64, model, skip_preprocessing } = body;
      const skipPreprocessing = parseSkipPreprocessing(skip_preprocessing);

      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      const processed = await processImage(
        undefined,
        image_base64,
        async (buffer) => handleReceiptScan(buffer, model, skipPreprocessing)
      );

      set.status = processed.status;
      return processed.response;
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
      },
    }
  )
  .post(
    "/barcodes/scan",
    async ({ body, set }) => {
      const { image } = body;
      const processed = await processImage(image, undefined, handleBarcodeScan);

      set.status = processed.status;
      return processed.response;
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
      const processed = await processImage(
        undefined,
        image_base64,
        handleBarcodeScan
      );

      set.status = processed.status;
      return processed.response;
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
  )
  .get(
    "",
    async ({ set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const receipts = await prisma.receipt.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        const mappedReceipts = receipts.map((receipt) => ({
          ...(receipt.data as Record<string, unknown>),
          id: receipt.id, // Database ID always takes precedence
          createdAt: receipt.createdAt.toISOString(),
        }));

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          receipts: mappedReceipts,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to fetch receipts",
        };
      }
    },
    {
      detail: {
        tags: ["receipts"],
        summary: "Get all receipts",
        description: "Get all receipts for the authenticated user",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const receipt = await prisma.receipt.findFirst({
          where: {
            id: params.id,
            userId: user.id,
          },
        });

        if (!receipt) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          receipt: {
            ...(receipt.data as Record<string, unknown>),
            id: receipt.id, // Database ID always takes precedence
            createdAt: receipt.createdAt.toISOString(),
          },
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to fetch receipt",
        };
      }
    },
    {
      detail: {
        tags: ["receipts"],
        summary: "Get receipt by ID",
        description: "Get a specific receipt by ID for the authenticated user",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const existing = await prisma.receipt.findFirst({
          where: {
            id: params.id,
            userId: user.id,
          },
        });

        if (!existing) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        // Merge updates with existing data
        const nextData = {
          ...(existing.data as Record<string, unknown>),
          ...body.updates,
        };

        const updated = await prisma.receipt.update({
          where: { id: params.id },
          data: { data: nextData },
        });

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          receipt: {
            id: updated.id,
            createdAt: updated.createdAt.toISOString(),
            ...(updated.data as Record<string, unknown>),
          },
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to update receipt",
        };
      }
    },
    {
      body: t.Object({
        updates: t.Partial(storedReceiptDataSchema),
      }),
      detail: {
        tags: ["receipts"],
        summary: "Update receipt",
        description: "Update a receipt by ID for the authenticated user",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const existing = await prisma.receipt.findFirst({
          where: {
            id: params.id,
            userId: user.id,
          },
        });

        if (!existing) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        await prisma.receipt.delete({
          where: { id: params.id },
        });

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to delete receipt",
        };
      }
    },
    {
      detail: {
        tags: ["receipts"],
        summary: "Delete receipt",
        description: "Delete a receipt by ID for the authenticated user",
      },
    }
  )
  .post(
    "/save",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        // Save receipt to database
        const receipt = await prisma.receipt.create({
          data: {
            userId: user.id,
            data: body.receipt,
          },
        });

        set.status = HTTP_STATUS.CREATED;
        return {
          success: true,
          receipt: {
            ...(receipt.data as Record<string, unknown>),
            id: receipt.id, // Database ID always takes precedence
            createdAt: receipt.createdAt.toISOString(),
          },
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to save receipt",
        };
      }
    },
    {
      body: t.Object({
        receipt: storedReceiptDataSchema,
      }),
      detail: {
        tags: ["receipts"],
        summary: "Save receipt",
        description: "Save a receipt to the database",
      },
    }
  );
