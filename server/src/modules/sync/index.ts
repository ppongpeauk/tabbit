/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync routes for offline receipt synchronization
 */

import { Elysia, t } from "elysia";
import { syncService } from "./service";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";

export const syncModule = new Elysia({ prefix: "/sync" })
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
    "/push",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const result = await syncService.pushReceipts(user.id, body.receipts);
        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          synced: result.synced,
          errors: result.errors,
        };
      } catch (error) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to sync receipts",
        };
      }
    },
    {
      body: t.Object({
        receipts: t.Array(
          t.Object({
            id: t.String(),
            data: t.Record(t.String(), t.Any()),
            createdAt: t.String(),
            updatedAt: t.String(),
          })
        ),
      }),
      detail: {
        tags: ["sync"],
        summary: "Push receipts to server",
        description: "Sync receipts from client to server.",
      },
    }
  )
  .get(
    "/pull",
    async ({ query, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const result = await syncService.pullReceipts(
          user.id,
          query.lastSyncAt || null
        );
        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          ...result,
        };
      } catch (error) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to pull receipts",
        };
      }
    },
    {
      query: t.Object({
        lastSyncAt: t.Optional(t.String()),
      }),
      detail: {
        tags: ["sync"],
        summary: "Pull receipts from server",
        description: "Sync receipts from server to client.",
      },
    }
  )
  .get(
    "/status",
    async ({ set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return {
          success: false,
          message: "Session expired. Please sign in again.",
        };
      }

      try {
        const canSync = await syncService.canSync(user.id);
        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          allowed: canSync.allowed,
          reason: canSync.reason,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to check sync status",
        };
      }
    },
    {
      detail: {
        tags: ["sync"],
        summary: "Check sync status",
        description:
          "Check if user can sync receipts. All authenticated users can sync.",
      },
    }
  );
