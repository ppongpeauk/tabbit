/**
 * @author Composer
 * @description Group management routes
 */

import { Elysia, t } from "elysia";
import { groupService } from "./service";
import { createGroupSchema, updateGroupSchema, joinGroupSchema } from "./model";
import { HTTP_STATUS } from "../../utils/constants";
import { handleServiceResult } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";
import {
  getPresignedUrl,
  getPresignedPostUrl,
  generateGroupIconKey,
} from "../../lib/s3";

export const groupModule = new Elysia({ prefix: "/groups" })
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
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.getUserGroups(user.id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["groups"],
        summary: "Get user's groups",
        description:
          "Retrieve all groups the authenticated user is a member of",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.getGroupById(id, user.id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["groups"],
        summary: "Get group by ID",
        description: "Retrieve a specific group by ID (must be a member)",
      },
    }
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.createGroup(user.id, body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.CREATED
      );
      set.status = status;
      return response;
    },
    {
      body: createGroupSchema,
      detail: {
        tags: ["groups"],
        summary: "Create new group",
        description: "Create a new group with the authenticated user as admin",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.updateGroup(id, user.id, body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateGroupSchema,
      detail: {
        tags: ["groups"],
        summary: "Update group",
        description: "Update group details (admin only)",
      },
    }
  )
  .post(
    "/join",
    async ({ body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.joinGroup(user.id, body.code);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      body: joinGroupSchema,
      detail: {
        tags: ["groups"],
        summary: "Join group",
        description: "Join a group using a group code",
      },
    }
  )
  .post(
    "/:id/leave",
    async ({ params: { id }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.leaveGroup(id, user.id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["groups"],
        summary: "Leave group",
        description: "Leave a group you're a member of",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      const result = await groupService.deleteGroup(id, user.id);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["groups"],
        summary: "Delete group",
        description: "Delete a group (admin only)",
      },
    }
  )
  .post(
    "/:id/icon/presigned",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        // Check if user is admin
        const groupResult = await groupService.getGroupById(id, user.id);
        if (!groupResult.success || !groupResult.group) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return { success: false, message: "Group not found" };
        }

        const member = groupResult.group.members.find(
          (m) => m.userId === user.id
        );
        if (!member || member.role !== "admin") {
          set.status = HTTP_STATUS.FORBIDDEN;
          return { success: false, message: "Only admins can upload icons" };
        }

        // Generate S3 key
        const extension = body.extension || "jpg";
        const key = generateGroupIconKey(id, extension);

        // Generate presigned POST URL
        const { url, fields } = await getPresignedPostUrl(
          key,
          `image/${extension}`,
          5_000_000 // 5MB max
        );

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          uploadUrl: url,
          fields,
          key,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate upload URL",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        extension: t.Optional(t.String()),
      }),
      detail: {
        tags: ["groups"],
        summary: "Get presigned URL for icon upload",
        description:
          "Get a presigned POST URL for uploading a group icon directly to S3",
      },
    }
  )
  .post(
    "/:id/icon/confirm",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        // Check if user is admin
        const groupResult = await groupService.getGroupById(id, user.id);
        if (!groupResult.success || !groupResult.group) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return { success: false, message: "Group not found" };
        }

        const member = groupResult.group.members.find(
          (m) => m.userId === user.id
        );
        if (!member || member.role !== "admin") {
          set.status = HTTP_STATUS.FORBIDDEN;
          return { success: false, message: "Only admins can update icons" };
        }

        // Update group with icon key
        const result = await groupService.updateGroupIcon(
          id,
          user.id,
          body.key
        );
        const { result: response, status } = handleServiceResult(
          result,
          HTTP_STATUS.OK
        );
        set.status = status;
        return response;
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to confirm icon upload",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ["groups"],
        summary: "Confirm icon upload",
        description:
          "Confirm that an icon has been uploaded and update the group",
      },
    }
  )
  .get(
    "/presigned/:key",
    async ({ params: { key }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Unauthorized" };
      }

      try {
        // Decode the key (it may be URL-encoded)
        const decodedKey = decodeURIComponent(key);

        // Verify user has access to this key (basic check - could be enhanced)
        // For now, we'll allow any authenticated user to access group icons
        // In production, you might want to verify group membership
        const presignedUrl = await getPresignedUrl(decodedKey, 3600); // 1 hour

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          url: presignedUrl,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate presigned URL",
        };
      }
    },
    {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ["groups"],
        summary: "Get presigned URL for file",
        description:
          "Get a presigned URL to access a file by its S3 key. Single endpoint to resolve keys to presigned URLs. Key should be URL-encoded.",
      },
    }
  );

