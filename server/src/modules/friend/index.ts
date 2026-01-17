/**
 * @author Composer
 * @description Friend management routes
 */

import { Elysia, t } from "elysia";
import { friendService } from "./service";
import {
  generateFriendTokenSchema,
  addFriendByTokenSchema,
  type FriendResponse,
  type FriendTokenResponse,
} from "./model";
import { HTTP_STATUS } from "../../utils/constants";
import { handleServiceResult, unauthorizedResponse } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";

export const friendModule = new Elysia({ prefix: "/friends" })
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
        return unauthorizedResponse();
      }

      const result = await friendService.getUserFriends(user.id);
      const { result: response, status } = handleServiceResult<FriendResponse>(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["friends"],
        summary: "Get user's friends",
        description: "Retrieve all friends for the authenticated user",
      },
    }
  )
  .post(
    "/token",
    async ({ user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await friendService.generateFriendToken(user.id);
      const { result: response, status } = handleServiceResult<FriendTokenResponse>(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["friends"],
        summary: "Generate friend request token",
        description: "Generate a unique QR code token for adding friends",
      },
    }
  )
  .post(
    "/add",
    async ({ body, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await friendService.addFriendByToken(user.id, body.token);
      const { result: response, status } = handleServiceResult<FriendResponse>(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.BAD_REQUEST
      );
      set.status = status;
      return response;
    },
    {
      body: addFriendByTokenSchema,
      detail: {
        tags: ["friends"],
        summary: "Add friend by token",
        description: "Add a friend by scanning their QR code token",
      },
    }
  )
  .delete(
    "/:friendId",
    async ({ params: { friendId }, user, set }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await friendService.removeFriend(user.id, friendId);
      const { result: response, status } = handleServiceResult<FriendResponse>(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.NOT_FOUND
      );
      set.status = status;
      return response;
    },
    {
      params: t.Object({
        friendId: t.String(),
      }),
      detail: {
        tags: ["friends"],
        summary: "Remove friend",
        description: "Remove a friend from the user's friend list",
      },
    }
  );
