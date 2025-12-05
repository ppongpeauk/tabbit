/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Subscription status endpoints and webhooks
 */

import { Elysia, t } from "elysia";
import { subscriptionService } from "./service";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

const REVENUECAT_WEBHOOK_SECRET = env.REVENUECAT_WEBHOOK_SECRET || "";

interface RevenueCatWebhookEvent {
  event: {
    id: string;
    type: string;
    app_user_id: string;
    product_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number | null;
    purchased_at_ms?: number;
  };
}

function verifyWebhookSignature(authHeader: string): boolean {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    return true;
  }

  return authHeader === REVENUECAT_WEBHOOK_SECRET;
}

export const subscriptionModule = new Elysia({ prefix: "/subscription" })
  .post(
    "/webhook",
    async ({ body, request, set }) => {
      const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("Authorization") ||
        "";

      if (!verifyWebhookSignature(authHeader)) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Invalid webhook authorization" };
      }

      const event = body as RevenueCatWebhookEvent;
      const userId = event.event?.app_user_id;
      const eventType = event.event?.type;

      if (!userId) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return { success: false, message: "Missing app_user_id" };
      }

      try {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!userExists) {
          console.warn(
            `[SubscriptionWebhook] User ${userId} not found in database, skipping`
          );
          set.status = HTTP_STATUS.OK;
          return {
            success: true,
            message: `User ${userId} not found, skipped`,
          };
        }

        const entitlementIds = event.event.entitlement_ids || [];
        const hasProEntitlement = entitlementIds.includes("Tabbit Pro");

        let expiresAt: Date | null = null;
        if (event.event.expiration_at_ms) {
          expiresAt = new Date(event.event.expiration_at_ms);
        }

        await subscriptionService.updateSubscriptionStatus(
          userId,
          hasProEntitlement,
          expiresAt
        );

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          message: `Processed ${eventType} event for user ${userId}`,
        };
      } catch (error) {
        console.error("[SubscriptionWebhook] Error processing webhook:", error);
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to process webhook",
        };
      }
    },
    {
      body: t.Record(t.String(), t.Any()),
      detail: {
        tags: ["subscription"],
        summary: "RevenueCat webhook endpoint",
        description: "Receives subscription events from RevenueCat",
      },
    }
  )
  .post(
    "/sync",
    async ({ request, set }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        const isPro = await subscriptionService.isProUser(session.user.id);
        set.status = HTTP_STATUS.OK;
        return { success: true, isPro };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to sync subscription",
        };
      }
    },
    {
      detail: {
        tags: ["subscription"],
        summary: "Sync subscription status",
        description: "Manually sync subscription status from RevenueCat",
      },
    }
  );

export { subscriptionService } from "./service";
