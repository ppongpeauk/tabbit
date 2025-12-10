/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync service for offline receipt synchronization
 */

import { prisma } from "../../lib/prisma";
import { subscriptionService } from "../subscription/service";
import { env } from "../../config/env";
import { uploadFile, getPresignedUrl } from "../../lib/s3";
import sharp from "sharp";
import { randomBytes } from "crypto";

/**
 * Compress receipt image using Sharp
 */
async function compressReceiptImage(
  imageBuffer: Buffer,
  quality: number = 85
): Promise<Buffer> {
  try {
    const compressed = await sharp(imageBuffer)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    return compressed;
  } catch (error) {
    console.error("Failed to compress image:", error);
    throw new Error("Failed to compress receipt image");
  }
}

/**
 * Generate S3 key for receipt image
 */
function generateReceiptImageKey(userId: string, receiptId: string): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  return `receipts/${userId}/${receiptId}-${timestamp}-${random}.jpg`;
}

export interface SyncReceipt {
  id: string; // Local ID from client
  data: Record<string, unknown>;
  imageUri?: string; // Base64 encoded image
  createdAt: string;
  updatedAt: string;
}

export interface SyncPushRequest {
  receipts: SyncReceipt[];
}

export interface SyncPullResponse {
  receipts: Array<{
    id: string;
    serverId: string;
    data: Record<string, unknown>;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
    syncedAt: string;
  }>;
  lastSyncAt: string | null;
}

export class SyncService {
  /**
   * Check if user can sync (all users can sync, but pro users get image storage)
   */
  async canSync(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // All users can sync, but only pro users get image storage
    return { allowed: true };
  }

  /**
   * Push receipts from client to server
   */
  async pushReceipts(
    userId: string,
    receipts: SyncReceipt[]
  ): Promise<{ success: boolean; synced: number; errors: number }> {
    const canSync = await this.canSync(userId);
    if (!canSync.allowed) {
      throw new Error(canSync.reason || "Sync not allowed");
    }

    // Check if user is pro (only pro users get image storage)
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);

    let synced = 0;
    let errors = 0;

    for (const receipt of receipts) {
      try {
        // Check if receipt already exists (by local ID stored in data)
        const existingReceipt = await prisma.receipt.findFirst({
          where: {
            userId,
            data: {
              path: ["id"],
              equals: receipt.id,
            },
          },
        });

        let imageKey: string | null = null;

        // Upload and compress image if provided AND user is pro
        if (receipt.imageUri && isPro) {
          try {
            const imageBuffer = Buffer.from(receipt.imageUri, "base64");
            const compressedBuffer = await compressReceiptImage(imageBuffer);

            const serverReceiptId =
              existingReceipt?.id || randomBytes(16).toString("hex");
            imageKey = generateReceiptImageKey(userId, serverReceiptId);

            await uploadFile(imageKey, compressedBuffer, "image/jpeg");
          } catch (error) {
            console.error(
              `Failed to upload image for receipt ${receipt.id}:`,
              error
            );
            // Continue without image if upload fails
          }
        }

        const receiptData = {
          ...receipt.data,
          id: receipt.id, // Preserve local ID
          imageKey: imageKey || undefined,
        };

        if (existingReceipt) {
          // Update existing receipt
          await prisma.receipt.update({
            where: { id: existingReceipt.id },
            data: {
              data: receiptData,
              imageKey,
              syncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new receipt
          await prisma.receipt.create({
            data: {
              userId,
              data: receiptData,
              imageKey,
              syncedAt: new Date(),
            },
          });
        }

        synced++;
      } catch (error) {
        console.error(`Failed to sync receipt ${receipt.id}:`, error);
        errors++;
      }
    }

    return { success: true, synced, errors };
  }

  /**
   * Pull receipts from server to client
   */
  async pullReceipts(
    userId: string,
    lastSyncAt: string | null
  ): Promise<SyncPullResponse> {
    const canSync = await this.canSync(userId);
    if (!canSync.allowed) {
      throw new Error(canSync.reason || "Sync not allowed");
    }

    // Check if user is pro (only pro users get image URLs)
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);

    const whereClause: {
      userId: string;
      syncedAt?: { gte: Date };
    } = {
      userId,
    };

    if (lastSyncAt) {
      whereClause.syncedAt = { gte: new Date(lastSyncAt) };
    }

    const receipts = await prisma.receipt.findMany({
      where: whereClause,
      orderBy: { syncedAt: "desc" },
    });

    const receiptsWithUrls = await Promise.all(
      receipts.map(async (receipt) => {
        let imageUrl: string | undefined;

        // Only provide image URLs for pro users
        if (receipt.imageKey && isPro) {
          try {
            imageUrl = await getPresignedUrl(receipt.imageKey, 3600);
          } catch (error) {
            console.error(
              `Failed to get presigned URL for ${receipt.imageKey}:`,
              error
            );
          }
        }

        return {
          id: (receipt.data as { id?: string }).id || receipt.id,
          serverId: receipt.id,
          data: receipt.data as Record<string, unknown>,
          imageUrl,
          createdAt: receipt.createdAt.toISOString(),
          updatedAt: receipt.updatedAt.toISOString(),
          syncedAt:
            receipt.syncedAt?.toISOString() || receipt.createdAt.toISOString(),
        };
      })
    );

    const latestSyncAt =
      receipts.length > 0 && receipts[0].syncedAt
        ? receipts[0].syncedAt.toISOString()
        : null;

    return {
      receipts: receiptsWithUrls,
      lastSyncAt: latestSyncAt,
    };
  }
}

export const syncService = new SyncService();
