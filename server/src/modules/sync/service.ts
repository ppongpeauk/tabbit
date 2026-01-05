/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync service for offline receipt synchronization
 */

import { prisma } from "../../lib/prisma";
import { plaidService } from "../plaid/service";


export interface SyncReceipt {
  id: string; // Local ID from client
  data: Record<string, unknown>;
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
    createdAt: string;
    updatedAt: string;
    syncedAt: string;
  }>;
  lastSyncAt: string | null;
}

export class SyncService {
  /**
   * Check if user can sync (all users can sync)
   */
  async canSync(): Promise<{ allowed: boolean; reason?: string }> {
    return { allowed: true };
  }

  /**
   * Push receipts from client to server
   * Uses conflict resolution based on updatedAt timestamps
   */
  async pushReceipts(
    userId: string,
    receipts: SyncReceipt[]
  ): Promise<{ success: boolean; synced: number; errors: number }> {
    const canSync = await this.canSync();
    if (!canSync.allowed) {
      throw new Error(canSync.reason || "Sync not allowed");
    }

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

        // Conflict resolution: Check if server version is newer
        if (existingReceipt) {
          const serverUpdatedAt = existingReceipt.updatedAt;
          const clientUpdatedAt = new Date(receipt.updatedAt);

          // If server is newer, skip this receipt (client will get updated version on pull)
          if (serverUpdatedAt > clientUpdatedAt) {
            console.log(
              `Skipping receipt ${receipt.id}: server version is newer`
            );
            synced++; // Count as synced since server has the latest
            continue;
          }
        }


        // Extract merchant and transaction data for enrichment
        const receiptDataFromClient = receipt.data as {
          merchant?: {
            name?: string;
            logo?: string;
            website?: string;
            category?: string[];
            address?: {
              line1?: string;
              city?: string;
              state?: string;
              postalCode?: string;
              country?: string;
            };
          };
          transaction?: {
            datetime?: string;
            transactionId?: string;
          };
          totals?: {
            total?: number;
            currency?: string;
          };
        };

        // Enrich receipt with Plaid Enrich API
        let enrichedData: {
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
        } = {};

        try {
          const merchantName =
            receiptDataFromClient.merchant?.name || "Unknown Merchant";
          const totalAmount = receiptDataFromClient.totals?.total || 0;
          const currency = receiptDataFromClient.totals?.currency || "USD";
          const transactionDate = receiptDataFromClient.transaction?.datetime
            ? new Date(receiptDataFromClient.transaction.datetime)
                .toISOString()
                .split("T")[0]
            : undefined;

          const enrichResult = await plaidService.enrichTransaction({
            description: merchantName,
            amount: totalAmount,
            currency,
            date: transactionDate,
            location: receiptDataFromClient.merchant?.address
              ? {
                  address: receiptDataFromClient.merchant.address.line1,
                  city: receiptDataFromClient.merchant.address.city,
                  region: receiptDataFromClient.merchant.address.state,
                  postalCode: receiptDataFromClient.merchant.address.postalCode,
                  country: receiptDataFromClient.merchant.address.country,
                }
              : undefined,
          });

          if (enrichResult.success && enrichResult.data) {
            enrichedData = enrichResult.data;
          }
        } catch (error) {
          console.error(`Failed to enrich receipt ${receipt.id}:`, error);
          // Continue without enrichment - don't fail the sync
        }

        // Merge enriched data into receipt data
        // Smart merge: use enriched data to fill gaps, but preserve original data
        const originalMerchant = receiptDataFromClient.merchant || {};
        const enrichedMerchant = {
          ...originalMerchant,
          // Use enriched merchant name if it's better (not generic), otherwise keep original
          name:
            enrichedData.merchantName &&
            enrichedData.merchantName !== "Unknown Merchant" &&
            enrichedData.merchantName.toLowerCase() !==
              (originalMerchant.name || "").toLowerCase()
              ? enrichedData.merchantName
              : originalMerchant.name || "Unknown Merchant",
          // Merge address: use enriched if more complete, otherwise keep original
          address:
            enrichedData.merchantAddress &&
            Object.keys(enrichedData.merchantAddress).length > 0
              ? {
                  ...originalMerchant.address,
                  ...enrichedData.merchantAddress,
                  // Prefer enriched data but keep original if enriched is missing fields
                  line1:
                    enrichedData.merchantAddress.line1 ||
                    originalMerchant.address?.line1,
                  city:
                    enrichedData.merchantAddress.city ||
                    originalMerchant.address?.city,
                  state:
                    enrichedData.merchantAddress.state ||
                    originalMerchant.address?.state,
                  postalCode:
                    enrichedData.merchantAddress.postalCode ||
                    originalMerchant.address?.postalCode,
                  country:
                    enrichedData.merchantAddress.country ||
                    originalMerchant.address?.country,
                }
              : originalMerchant.address,
          // Add enriched-only fields (logo, website, category)
          logo: enrichedData.merchantLogo || originalMerchant.logo,
          website: enrichedData.website || originalMerchant.website,
          category: enrichedData.category || originalMerchant.category,
        };

        const receiptData = {
          ...receipt.data,
          id: receipt.id, // Preserve local ID
          merchant: enrichedMerchant,
        };

        const clientUpdatedAt = new Date(receipt.updatedAt);
        const clientCreatedAt = new Date(receipt.createdAt);

        if (existingReceipt) {
          // Update existing receipt - use transaction for atomicity
          await prisma.receipt.update({
            where: { id: existingReceipt.id },
            data: {
              data: receiptData,
              syncedAt: new Date(),
              updatedAt: clientUpdatedAt, // Use client's updatedAt for conflict resolution
              // Ensure createdAt is not older than existing
              createdAt:
                clientCreatedAt < existingReceipt.createdAt
                  ? existingReceipt.createdAt
                  : clientCreatedAt,
            },
          });
        } else {
          // Create new receipt
          await prisma.receipt.create({
            data: {
              userId,
              data: receiptData,
              syncedAt: new Date(),
              createdAt: clientCreatedAt,
              updatedAt: clientUpdatedAt,
            },
          });
        }

        synced++;
      } catch (error) {
        console.error(`Failed to sync receipt ${receipt.id}:`, error);
        errors++;
        // Continue processing other receipts even if one fails
      }
    }

    return { success: true, synced, errors };
  }

  /**
   * Pull receipts from server to client
   * Uses updatedAt for better conflict detection
   */
  async pullReceipts(
    userId: string,
    lastSyncAt: string | null
  ): Promise<SyncPullResponse> {
    const canSync = await this.canSync();
    if (!canSync.allowed) {
      throw new Error(canSync.reason || "Sync not allowed");
    }

    // Use updatedAt for better conflict resolution
    // This ensures we get all receipts that have been updated since last sync
    const whereClause: {
      userId: string;
      updatedAt?: { gte: Date };
    } = {
      userId,
    };

    if (lastSyncAt) {
      // Use updatedAt instead of syncedAt for more accurate sync
      whereClause.updatedAt = { gte: new Date(lastSyncAt) };
    }

    const receipts = await prisma.receipt.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" }, // Order by updatedAt for consistency
    });

    const receiptsWithData = receipts.map((receipt) => {
      // Ensure we have a local ID in the data
      const receiptData = receipt.data as Record<string, unknown>;
      const localId = (receiptData.id as string) || receipt.id;

      return {
        id: localId,
        serverId: receipt.id,
        data: receiptData,
        createdAt: receipt.createdAt.toISOString(),
        updatedAt: receipt.updatedAt.toISOString(),
        syncedAt:
          receipt.syncedAt?.toISOString() || receipt.updatedAt.toISOString(),
      };
    });

    // Use the latest updatedAt as the sync timestamp
    // This ensures we track when data was actually modified, not just synced
    const latestSyncAt =
      receipts.length > 0 && receipts[0].updatedAt
        ? receipts[0].updatedAt.toISOString()
        : null;

    return {
      receipts: receiptsWithData,
      lastSyncAt: latestSyncAt,
    };
  }
}

export const syncService = new SyncService();
