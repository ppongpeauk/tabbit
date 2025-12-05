/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Limit checking endpoints for free plan users
 */

import { Elysia, t } from "elysia";
import { limitService } from "./service";
import { handleServiceResult } from "../../utils/route-helpers";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";

export const limitModule = new Elysia({ prefix: "/limits" })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return { user: null };
    }
    return { user: session.user };
  })
  .get(
    "/status",
    async ({ user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        const status = await limitService.getLimitStatus(user.id);
        set.status = HTTP_STATUS.OK;
        return { success: true, ...status };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to get limit status",
        };
      }
    },
    {
      detail: {
        tags: ["limits"],
        summary: "Get limit status",
        description: "Get current usage and limits for the authenticated user",
      },
    }
  )
  .post(
    "/check-scan",
    async ({ user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        const result = await limitService.canScan(user.id);
        set.status = HTTP_STATUS.OK;
        return { success: true, ...result };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to check scan limit",
        };
      }
    },
    {
      detail: {
        tags: ["limits"],
        summary: "Check if user can scan",
        description: "Check if the user has remaining monthly scans",
      },
    }
  )
  .post(
    "/check-save",
    async ({ user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        const result = await limitService.canSaveReceipt(user.id);
        set.status = HTTP_STATUS.OK;
        return { success: true, ...result };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to check save limit",
        };
      }
    },
    {
      detail: {
        tags: ["limits"],
        summary: "Check if user can save receipt",
        description: "Check if the user has remaining receipt storage space",
      },
    }
  );
