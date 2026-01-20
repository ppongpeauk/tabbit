/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt scanning and barcode detection routes
 */

import { Elysia, t } from "elysia";
import { Prisma } from "@prisma/client";
import sharp from "sharp";
import { receiptService } from "./service";
import {
  defaultReceiptSchema,
  storedReceiptDataSchema,
  type StoredReceiptData,
} from "./model";
import { detectBarcodes } from "../../utils/barcode-detector";
import { HTTP_STATUS } from "../../utils/constants";
import { errorResponse, unauthorizedResponse } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { plaidService } from "../plaid/service";
import { env } from "../../config/env";
import {
  uploadFile,
  deleteFile,
  getPresignedUrl,
  generateReceiptImageKey,
} from "../../lib/s3";

function parseSkipPreprocessing(value: string | boolean | undefined): boolean {
  return value === true || (typeof value === "string" && value === "true");
}

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

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

async function handleBarcodeScan(imageBuffer: Buffer) {
  const barcodes = await detectBarcodes(imageBuffer);
  return {
    success: true,
    barcodes,
    count: barcodes.length,
    status: HTTP_STATUS.OK,
  };
}

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
    const message = "Image file or image_base64 is required";
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

function isNonEmptyString(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string | undefined | null): string {
  return isNonEmptyString(value) ? value.trim().replace(/\s+/g, " ") : "";
}

const RECEIPT_PHOTO_MAX_WIDTH = 1600;
const RECEIPT_PHOTO_QUALITY = 80;

interface ReceiptImageUploadResult {
  key: string;
  width?: number;
  height?: number;
}

async function compressReceiptImage(imageBuffer: Buffer): Promise<{
  buffer: Buffer;
  width?: number;
  height?: number;
}> {
  const pipeline = sharp(imageBuffer).rotate().resize({
    width: RECEIPT_PHOTO_MAX_WIDTH,
    withoutEnlargement: true,
  });

  const metadata = await pipeline.metadata();
  const buffer = await pipeline
    .jpeg({
      quality: RECEIPT_PHOTO_QUALITY,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    buffer,
    width: metadata.width,
    height: metadata.height,
  };
}

async function uploadReceiptImage(
  receiptId: string,
  imageBase64: string
): Promise<ReceiptImageUploadResult> {
  const rawBuffer = Buffer.from(imageBase64, "base64");
  const compressed = await compressReceiptImage(rawBuffer);
  const key = generateReceiptImageKey(receiptId, "jpg");

  await uploadFile(key, compressed.buffer, "image/jpeg");

  return {
    key,
    width: compressed.width,
    height: compressed.height,
  };
}

function getReceiptImageKey(
  receipt: StoredReceiptData | null | undefined
): string | null {
  if (!receipt?.appData?.images?.length) {
    return null;
  }

  const firstImage = receipt.appData.images[0];

  if (isNonEmptyString(firstImage?.key)) {
    return firstImage.key;
  }

  if (isNonEmptyString(firstImage?.url)) {
    return firstImage.url;
  }

  return null;
}

function addReceiptImageToData(
  receipt: StoredReceiptData,
  image: ReceiptImageUploadResult
): StoredReceiptData {
  const existingImages = receipt.appData?.images ?? [];
  const filteredImages = existingImages.filter(
    (item) => item.type !== "original"
  );

  const nextImages = [{ key: image.key, type: "original" }, ...filteredImages];
  const nextAppData = { ...(receipt.appData ?? {}), images: nextImages };
  const nextTechnical = {
    ...(receipt.technical ?? {}),
    originalImage: {
      url: image.key,
      width: image.width,
      height: image.height,
    },
  };

  return {
    ...receipt,
    appData: nextAppData,
    technical: nextTechnical,
  };
}

function getEnrichDate(datetime: string | undefined): string | undefined {
  if (!isNonEmptyString(datetime)) {
    return undefined;
  }
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString().split("T")[0];
}

function buildEnrichDescription(receipt: StoredReceiptData): string {
  console.log("[PlaidEnrich] Building description for receipt:", {
    merchantName: receipt.merchant.name,
  });

  const merchantName = normalizeText(receipt.merchant.name);

  console.log("[PlaidEnrich] Normalized merchant name:", merchantName);

  if (!merchantName) {
    console.log("[PlaidEnrich] No merchant name found");
    return "";
  }

  const description = merchantName;
  console.log(
    "[PlaidEnrich] Built description (merchant name only):",
    description
  );
  return description;
}

function buildEnrichLocation(merchant: StoredReceiptData["merchant"]) {
  console.log("[PlaidEnrich] Building location from merchant address:", {
    hasAddress: !!merchant.address,
    address: merchant.address,
  });

  const address = merchant.address;
  if (!address) {
    console.log("[PlaidEnrich] No address found, skipping location");
    return undefined;
  }

  const hasLocation =
    isNonEmptyString(address.line1) ||
    isNonEmptyString(address.city) ||
    isNonEmptyString(address.state) ||
    isNonEmptyString(address.postalCode) ||
    isNonEmptyString(address.country);

  if (!hasLocation) {
    console.log("[PlaidEnrich] Address exists but no valid location fields");
    return undefined;
  }

  const location = {
    address: address.line1,
    city: address.city,
    region: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };

  console.log("[PlaidEnrich] Built location:", location);
  return location;
}

function shouldUpdateMerchantName(
  currentName: string | undefined,
  receiptName: string | undefined,
  enrichedName: string | undefined
): boolean {
  console.log("[PlaidEnrich] Checking if should update merchant name:", {
    currentName,
    receiptName,
    enrichedName,
  });

  if (!isNonEmptyString(enrichedName)) {
    console.log("[PlaidEnrich] No enriched name provided, skipping update");
    return false;
  }
  if (!isNonEmptyString(currentName)) {
    console.log(
      "[PlaidEnrich] No current name, will update with enriched name"
    );
    return true;
  }

  const normalizedCurrent = currentName.trim().toLowerCase();
  const normalizedReceipt = normalizeText(receiptName).toLowerCase();

  const shouldUpdate: boolean =
    normalizedCurrent === "unknown" ||
    normalizedCurrent === "unknown merchant" ||
    Boolean(normalizedReceipt && normalizedCurrent === normalizedReceipt);

  console.log("[PlaidEnrich] Should update merchant name:", shouldUpdate, {
    normalizedCurrent,
    normalizedReceipt,
  });

  return shouldUpdate;
}

type EnrichStatus = "success" | "failed" | "skipped";
type EnrichData = {
  merchantName?: string;
  merchantLogo?: string;
  merchantAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  category?: string[];
  website?: string;
};

function applyPlaidEnrich(
  existingData: StoredReceiptData,
  enrichData: EnrichData | null,
  status: EnrichStatus,
  message?: string
): StoredReceiptData {
  console.log("[PlaidEnrich] Applying enrich data:", {
    status,
    message,
    hasEnrichData: !!enrichData,
    enrichData: enrichData
      ? {
          hasMerchantName: !!enrichData.merchantName,
          hasMerchantLogo: !!enrichData.merchantLogo,
          hasWebsite: !!enrichData.website,
          hasCategory: !!enrichData.category,
          hasAddress: !!enrichData.merchantAddress,
        }
      : null,
  });

  const nextMerchant = { ...existingData.merchant };

  if (enrichData) {
    if (
      shouldUpdateMerchantName(
        existingData.merchant.name,
        existingData.name,
        enrichData.merchantName
      )
    ) {
      console.log("[PlaidEnrich] Updating merchant name:", {
        from: existingData.merchant.name,
        to: enrichData.merchantName,
      });
      nextMerchant.name = enrichData.merchantName ?? existingData.merchant.name;
    }

    if (isNonEmptyString(enrichData.merchantLogo)) {
      console.log(
        "[PlaidEnrich] Adding merchant logo:",
        enrichData.merchantLogo
      );
      nextMerchant.logo = enrichData.merchantLogo;
    }

    if (isNonEmptyString(enrichData.website)) {
      console.log("[PlaidEnrich] Adding merchant website:", enrichData.website);
      nextMerchant.website = enrichData.website;
    }

    if (Array.isArray(enrichData.category) && enrichData.category.length > 0) {
      console.log(
        "[PlaidEnrich] Adding merchant categories:",
        enrichData.category
      );
      nextMerchant.category = enrichData.category;
    }

    if (enrichData.merchantAddress) {
      const currentAddress = existingData.merchant.address ?? {};
      const mergedAddress = {
        line1: enrichData.merchantAddress.line1 ?? currentAddress.line1,
        city: enrichData.merchantAddress.city ?? currentAddress.city,
        state: enrichData.merchantAddress.state ?? currentAddress.state,
        postalCode:
          enrichData.merchantAddress.postalCode ?? currentAddress.postalCode,
        country: enrichData.merchantAddress.country ?? currentAddress.country,
      };
      const hasMergedAddress =
        Object.values(mergedAddress).some(isNonEmptyString);
      if (hasMergedAddress) {
        console.log("[PlaidEnrich] Merging address:", mergedAddress);
        nextMerchant.address = mergedAddress;
      }
    }
  }

  const nextTechnical = {
    ...existingData.technical,
    plaidEnrich: {
      status,
      attemptedAt: new Date().toISOString(),
      message,
    },
  };

  console.log("[PlaidEnrich] Final merchant data:", {
    name: nextMerchant.name,
    hasLogo: !!nextMerchant.logo,
    hasWebsite: !!nextMerchant.website,
    hasCategory: !!nextMerchant.category,
    hasAddress: !!nextMerchant.address,
  });

  return {
    ...existingData,
    merchant: nextMerchant,
    technical: nextTechnical,
  };
}

async function updateReceiptWithEnrich(
  receiptId: string,
  enrichData: EnrichData | null,
  status: EnrichStatus,
  message?: string
): Promise<void> {
  console.log("[PlaidEnrich] Updating receipt with enrich data:", {
    receiptId,
    status,
    message,
  });

  const existing = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { data: true },
  });

  if (!existing) {
    console.log("[PlaidEnrich] Receipt not found, skipping update:", receiptId);
    return;
  }

  const existingData = existing.data as StoredReceiptData;
  const nextData = applyPlaidEnrich(existingData, enrichData, status, message);

  console.log("[PlaidEnrich] Saving updated receipt to database");
  await prisma.receipt.update({
    where: { id: receiptId },
    data: { data: toPrismaJsonValue(nextData as Record<string, unknown>) },
  });
  console.log("[PlaidEnrich] Receipt updated successfully");
}

async function enrichReceiptAfterSave(
  receiptId: string,
  receipt: StoredReceiptData
): Promise<void> {
  if (env.DISABLE_PLAID_ENRICH) {
    console.log("[PlaidEnrich] Enrichment disabled via DISABLE_PLAID_ENRICH config");
    return;
  }

  console.log("[PlaidEnrich] ========================================");
  console.log("[PlaidEnrich] Starting enrichment for receipt:", receiptId);
  console.log("[PlaidEnrich] Receipt data:", {
    name: receipt.name,
    merchantName: receipt.merchant.name,
    total: receipt.totals.total,
    currency: receipt.totals.currency,
    itemCount: receipt.items.length,
    hasAddress: !!receipt.merchant.address,
  });

  try {
    const description = buildEnrichDescription(receipt);
    if (!isNonEmptyString(description)) {
      console.log("[PlaidEnrich] Skipping: Missing description");
      await updateReceiptWithEnrich(
        receiptId,
        null,
        "skipped",
        "Missing description for enrich"
      );
      return;
    }

    const total = receipt.totals.total;
    const amount = Number.isFinite(total) ? Math.abs(total) : 0;
    console.log("[PlaidEnrich] Amount calculation:", { total, amount });
    if (!Number.isFinite(amount) || amount <= 0) {
      console.log("[PlaidEnrich] Skipping: Invalid amount");
      await updateReceiptWithEnrich(
        receiptId,
        null,
        "skipped",
        "Missing total amount for enrich"
      );
      return;
    }

    const direction = total < 0 ? "inflow" : "outflow";
    const currency = normalizeText(receipt.totals.currency) || "USD";
    const date = getEnrichDate(receipt.transaction.datetime);
    const location = buildEnrichLocation(receipt.merchant);

    console.log("[PlaidEnrich] Prepared transaction data:", {
      id: receipt.transaction.transactionId || receiptId,
      description,
      amount,
      currency,
      date,
      direction,
      hasLocation: !!location,
      location,
    });

    console.log("[PlaidEnrich] Calling Plaid Enrich API...");
    const enrichResult = await plaidService.enrichTransaction({
      id: receipt.transaction.transactionId || receiptId,
      description,
      amount,
      currency,
      date,
      direction,
      location,
    });

    console.log("[PlaidEnrich] Plaid API response:", {
      success: enrichResult.success,
      hasData: !!enrichResult.data,
      dataKeys: enrichResult.data ? Object.keys(enrichResult.data) : [],
      message: enrichResult.message,
      error: enrichResult.error,
    });

    if (!enrichResult.success) {
      console.log("[PlaidEnrich] Enrich failed:", enrichResult.message);
      await updateReceiptWithEnrich(
        receiptId,
        null,
        "failed",
        enrichResult.message || "Enrich API call failed"
      );
      return;
    }

    const data = enrichResult.data;
    const hasEnrichData =
      Boolean(data?.merchantName) ||
      Boolean(data?.merchantLogo) ||
      Boolean(data?.merchantAddress) ||
      Boolean(data?.website) ||
      (Array.isArray(data?.category) && data.category.length > 0);

    console.log("[PlaidEnrich] Checking enrich data:", {
      hasMerchantName: !!data?.merchantName,
      hasMerchantLogo: !!data?.merchantLogo,
      hasMerchantAddress: !!data?.merchantAddress,
      hasWebsite: !!data?.website,
      hasCategory: Array.isArray(data?.category) && data.category.length > 0,
      hasEnrichData,
    });

    if (hasEnrichData) {
      console.log("[PlaidEnrich] Enrichment successful, applying data:", {
        merchantName: data?.merchantName,
        hasLogo: !!data?.merchantLogo,
        hasWebsite: !!data?.website,
        hasCategory: !!data?.category,
        hasAddress: !!data?.merchantAddress,
      });
    } else {
      console.log("[PlaidEnrich] No enrichment data returned");
    }

    await updateReceiptWithEnrich(
      receiptId,
      data ?? null,
      hasEnrichData ? "success" : "skipped",
      hasEnrichData
        ? "Enrichment completed successfully"
        : "No enrichment data returned"
    );

    console.log("[PlaidEnrich] Enrichment process completed successfully");
    console.log("[PlaidEnrich] ========================================");
  } catch (error) {
    console.error("[PlaidEnrich] ========================================");
    console.error("[PlaidEnrich] ERROR during enrichment:", error);
    console.error("[PlaidEnrich] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error("[PlaidEnrich] ========================================");
    const message = error instanceof Error ? error.message : "Enrich failed";
    await updateReceiptWithEnrich(receiptId, null, "failed", message);
  }
}

/**
 * Maps receipt database record to API response format
 */
function mapReceiptToResponse(receipt: {
  id: string;
  data: Prisma.JsonValue;
  createdAt: Date;
  userId: string;
}) {
  return {
    ...(receipt.data as Record<string, unknown>),
    id: receipt.id,
    createdAt: receipt.createdAt.toISOString(),
    ownerId: receipt.userId,
  };
}

/**
 * Finds a receipt by ID and user ID, returns null if not found
 */
async function findReceiptByIdAndUser(
  receiptId: string,
  userId: string
): Promise<{
  id: string;
  data: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date | null;
  userId: string;
} | null> {
  return prisma.receipt.findFirst({
    where: {
      id: receiptId,
      userId,
    },
  });
}

/**
 * Checks if a user has access to a receipt (owner or shared)
 */
async function userHasAccessToReceipt(
  receiptId: string,
  userId: string
): Promise<boolean> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      sharedWith: {
        where: { userId },
      },
    },
  });

  if (!receipt) {
    return false;
  }

  // User is owner or has been shared with
  return receipt.userId === userId || receipt.sharedWith.length > 0;
}

/**
 * Finds a receipt by ID that the user has access to (owner or shared)
 */
async function findReceiptWithAccess(
  receiptId: string,
  userId: string
): Promise<{
  id: string;
  data: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date | null;
  userId: string;
} | null> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      sharedWith: {
        where: { userId },
      },
    },
  });

  if (!receipt) {
    return null;
  }

  // User is owner or has been shared with
  if (receipt.userId === userId || receipt.sharedWith.length > 0) {
    return {
      id: receipt.id,
      data: receipt.data,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      syncedAt: receipt.syncedAt,
      userId: receipt.userId,
    };
  }

  return null;
}

/**
 * Finds a receipt by ID, returns null if not found
 */
async function findReceiptById(receiptId: string): Promise<{
  id: string;
  data: Prisma.JsonValue;
  createdAt: Date;
  userId: string;
} | null> {
  return prisma.receipt.findUnique({
    where: {
      id: receiptId,
    },
    select: {
      id: true,
      data: true,
      createdAt: true,
      userId: true,
    },
  });
}

/**
 * Converts receipt data to Prisma-compatible JSON value
 */
function toPrismaJsonValue(
  data: Record<string, unknown>
): Prisma.InputJsonValue {
  return data as Prisma.InputJsonValue;
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
        return unauthorizedResponse();
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
        return unauthorizedResponse();
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
      try {
        const processed = await processImage(
          image,
          undefined,
          handleBarcodeScan
        );
        set.status = processed.status;
        return processed.response;
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to detect barcodes",
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
      try {
        const processed = await processImage(
          undefined,
          image_base64,
          handleBarcodeScan
        );
        set.status = processed.status;
        return processed.response;
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to detect barcodes",
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
  )
  .get(
    "",
    async ({ set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        // Get receipts owned by user and receipts shared with user
        const [ownedReceipts, sharedReceipts] = await Promise.all([
          prisma.receipt.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.receipt.findMany({
            where: {
              sharedWith: {
                some: {
                  userId: user.id,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        // Combine and deduplicate (in case a receipt is both owned and shared)
        const receiptMap = new Map<string, typeof ownedReceipts[0]>();
        ownedReceipts.forEach((r) => receiptMap.set(r.id, r));
        sharedReceipts.forEach((r) => receiptMap.set(r.id, r));

        const allReceipts = Array.from(receiptMap.values()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        const mappedReceipts = allReceipts.map(mapReceiptToResponse);

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
        description: "Get all receipts for the authenticated user (owned and shared)",
      },
    }
  )
  .get(
    "/public/:id",
    async ({ params, set }) => {
      try {
        const receipt = await findReceiptById(params.id);

        if (!receipt) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        const receiptData = receipt.data as Record<string, unknown>;
        const visibility =
          typeof receiptData.visibility === "string"
            ? receiptData.visibility
            : "private";

        if (visibility !== "public") {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          receipt: mapReceiptToResponse(receipt),
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
        summary: "Get receipt by ID (public)",
        description:
          "Get a specific receipt by ID without authentication for sharing",
      },
    }
  )
  .get(
    "/:id/photo-url",
    async ({ params, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const receipt = await findReceiptWithAccess(params.id, user.id);

        if (!receipt) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        const receiptData = receipt.data as StoredReceiptData;
        const imageKey = getReceiptImageKey(receiptData);

        if (!imageKey) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt photo not found",
          };
        }

        const url = await getPresignedUrl(imageKey, 3600);

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          url,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to load receipt photo",
        };
      }
    },
    {
      detail: {
        tags: ["receipts"],
        summary: "Get receipt photo URL",
        description: "Get a presigned URL for a receipt photo (owner or shared)",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const receipt = await findReceiptWithAccess(params.id, user.id);

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
          receipt: mapReceiptToResponse(receipt),
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
        description: "Get a specific receipt by ID for the authenticated user (owned or shared)",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const existing = await findReceiptByIdAndUser(params.id, user.id);

        if (!existing) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        // Only the owner can update the receipt
        if (existing.userId !== user.id) {
          set.status = HTTP_STATUS.FORBIDDEN;
          return {
            success: false,
            message: "You do not have permission to update this receipt",
          };
        }

        // Merge existing data with updates, ensuring type safety for Prisma JSON field
        const existingData = existing.data as Record<string, unknown>;
        const mergedData = {
          ...existingData,
          ...body.updates,
        };
        const nextData = toPrismaJsonValue(mergedData);

        const updated = await prisma.receipt.update({
          where: { id: params.id },
          data: { data: nextData },
        });

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          receipt: mapReceiptToResponse(updated),
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
        description: "Update a receipt by ID (only owner can update)",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const existing = await findReceiptByIdAndUser(params.id, user.id);

        if (!existing) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        // Only the owner can delete the receipt
        if (existing.userId !== user.id) {
          set.status = HTTP_STATUS.FORBIDDEN;
          return {
            success: false,
            message: "You do not have permission to delete this receipt",
          };
        }

        const existingData = existing.data as StoredReceiptData;
        const imageKey = getReceiptImageKey(existingData);
        if (imageKey) {
          await deleteFile(imageKey);
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
        description: "Delete a receipt by ID (only owner can delete)",
      },
    }
  )
  .post(
    "/:id/share",
    async ({ params, body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const receipt = await findReceiptByIdAndUser(params.id, user.id);

        if (!receipt) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return {
            success: false,
            message: "Receipt not found",
          };
        }

        // Only the owner can share the receipt
        if (receipt.userId !== user.id) {
          set.status = HTTP_STATUS.FORBIDDEN;
          return {
            success: false,
            message: "You do not have permission to share this receipt",
          };
        }

        const { friendIds } = body as { friendIds: string[] };

        if (!Array.isArray(friendIds) || friendIds.length === 0) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return {
            success: false,
            message: "friendIds must be a non-empty array",
          };
        }

        // Verify all friendIds are valid friends
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { user1Id: user.id, user2Id: { in: friendIds } },
              { user2Id: user.id, user1Id: { in: friendIds } },
            ],
          },
        });

        const validFriendIds = new Set<string>();
        friendships.forEach((f) => {
          if (f.user1Id === user.id) {
            validFriendIds.add(f.user2Id);
          } else {
            validFriendIds.add(f.user1Id);
          }
        });

        const invalidFriendIds = friendIds.filter((id) => !validFriendIds.has(id));
        if (invalidFriendIds.length > 0) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return {
            success: false,
            message: `Invalid friend IDs: ${invalidFriendIds.join(", ")}`,
          };
        }

        // Create or update receipt shares
        await Promise.all(
          friendIds.map((friendId) =>
            prisma.receiptShare.upsert({
              where: {
                receiptId_userId: {
                  receiptId: params.id,
                  userId: friendId,
                },
              },
              create: {
                receiptId: params.id,
                userId: friendId,
              },
              update: {},
            })
          )
        );

        // Make receipt collaborative if not already
        const receiptData = receipt.data as StoredReceiptData;
        if (!receiptData.splitData) {
          const updatedData = {
            ...receiptData,
            splitData: {},
          };
          await prisma.receipt.update({
            where: { id: params.id },
            data: { data: toPrismaJsonValue(updatedData as Record<string, unknown>) },
          });
        }

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          message: "Receipt shared successfully",
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to share receipt",
        };
      }
    },
    {
      body: t.Object({
        friendIds: t.Array(t.String()),
      }),
      detail: {
        tags: ["receipts"],
        summary: "Share receipt with friends",
        description: "Share a receipt with friends and make it collaborative",
      },
    }
  )
  .post(
    "/save",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        const receiptData = body.receipt as StoredReceiptData;
        const receipt = await prisma.receipt.create({
          data: {
            userId: user.id,
            data: toPrismaJsonValue(receiptData as Record<string, unknown>),
          },
        });

        let responseReceipt = receipt;
        if (isNonEmptyString(body.image_base64)) {
          try {
            const uploaded = await uploadReceiptImage(
              receipt.id,
              body.image_base64
            );
            const nextData = addReceiptImageToData(receiptData, uploaded);

            responseReceipt = await prisma.receipt.update({
              where: { id: receipt.id },
              data: {
                data: toPrismaJsonValue(nextData as Record<string, unknown>),
              },
            });
          } catch (error) {
            await prisma.receipt.delete({ where: { id: receipt.id } });
            throw error;
          }
        }

        console.log("[PlaidEnrich] Receipt saved, triggering enrichment:", {
          receiptId: receipt.id,
          userId: user.id,
          merchantName: receiptData.merchant?.name,
        });
        void enrichReceiptAfterSave(receipt.id, receiptData);

        set.status = HTTP_STATUS.CREATED;
        return {
          success: true,
          receipt: mapReceiptToResponse(responseReceipt),
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
        image_base64: t.Optional(t.String()),
      }),
      detail: {
        tags: ["receipts"],
        summary: "Save receipt",
        description: "Save a receipt to the database",
      },
    }
  );
