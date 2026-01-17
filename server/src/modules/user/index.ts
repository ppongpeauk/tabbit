/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description User management routes
 */

import { Elysia, t } from "elysia";
import { userService } from "./service";
import { createUserSchema, updateUserSchema, type UserResponse } from "./model";
import { HTTP_STATUS } from "../../utils/constants";
import { handleServiceResult, unauthorizedResponse } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";
import {
  getPresignedUrl,
  getPresignedPostUrl,
  generateUserProfileKey,
} from "../../lib/s3";

export const userModule = new Elysia({ prefix: "/users" })
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
    async ({ set }) => {
      const result = await userService.getAllUsers();
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["user"],
        summary: "Get all users",
        description: "Retrieve a list of all users",
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await userService.getUserById(id);
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
        tags: ["user"],
        summary: "Get user by ID",
        description: "Retrieve a specific user by their ID",
      },
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const result = await userService.createUser(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.CREATED
      );
      set.status = status;
      return response;
    },
    {
      body: createUserSchema,
      detail: {
        tags: ["user"],
        summary: "Create new user",
        description: "Create a new user account",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      if (user.id !== id) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return { success: false, message: "You can only update your own profile" };
      }

      const result = await userService.updateUser(id, body);
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
      body: updateUserSchema,
      detail: {
        tags: ["user"],
        summary: "Update user",
        description: "Update an existing user by ID (users can only update their own profile)",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const result = await userService.deleteUser(id);
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
        tags: ["user"],
        summary: "Delete user",
        description: "Delete a user by ID",
      },
    }
  )
  .post(
    "/:id/profile/presigned",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      if (user.id !== id) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return { success: false, message: "You can only upload your own profile picture" };
      }

      try {
        const extension = body.extension || "jpg";
        const key = generateUserProfileKey(id, extension);
        const contentType =
          extension === "jpg" ? "image/jpeg" : `image/${extension}`;
        const { url, fields } = await getPresignedPostUrl(
          key,
          contentType,
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
        tags: ["user"],
        summary: "Get presigned URL for profile picture upload",
        description:
          "Get a presigned POST URL for uploading a user profile picture directly to S3",
      },
    }
  )
  .post(
    "/:id/profile/confirm",
    async ({ params: { id }, body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      if (user.id !== id) {
        set.status = HTTP_STATUS.FORBIDDEN;
        return { success: false, message: "You can only update your own profile picture" };
      }

      try {
        const result = await userService.updateUser(id, { image: body.key });
        const { result: response, status } = handleServiceResult<UserResponse>(
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
              : "Failed to confirm profile picture upload",
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
        tags: ["user"],
        summary: "Confirm profile picture upload",
        description:
          "Confirm that a profile picture has been uploaded and update the user",
      },
    }
  )
  .get(
    "/presigned/:key",
    async ({ params: { key }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      try {
        if (!key.startsWith("users/")) {
          set.status = HTTP_STATUS.FORBIDDEN;
          return { success: false, message: "Invalid key" };
        }

        const url = await getPresignedUrl(key);
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
              : "Failed to get presigned URL",
        };
      }
    },
    {
      params: t.Object({
        key: t.String(),
      }),
      detail: {
        tags: ["user"],
        summary: "Get presigned URL for viewing profile picture",
        description:
          "Get a presigned URL for viewing a user profile picture from S3",
      },
    }
  );
