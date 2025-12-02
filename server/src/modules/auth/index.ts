/**
 * @author Recipio Team
 * @description Authentication module routes and handlers
 */

import { Elysia } from "elysia";
import { authService } from "./service";
import { loginSchema, registerSchema } from "./model";
import { HTTP_STATUS } from "../../utils/constants";

export const authModule = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, set }) => {
      const result = await authService.login(body);

      if (!result.success) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return result;
      }

      set.status = HTTP_STATUS.OK;
      return result;
    },
    {
      body: loginSchema,
      detail: {
        tags: ["auth"],
        summary: "Login user",
        description: "Authenticate a user with email and password",
      },
    }
  )
  .post(
    "/register",
    async ({ body, set }) => {
      const result = await authService.register(body);

      if (!result.success) {
        set.status = HTTP_STATUS.BAD_REQUEST;
        return result;
      }

      set.status = HTTP_STATUS.CREATED;
      return result;
    },
    {
      body: registerSchema,
      detail: {
        tags: ["auth"],
        summary: "Register new user",
        description: "Create a new user account",
      },
    }
  )
  .get(
    "/me",
    async ({ headers, set }) => {
      const token = headers.authorization?.replace("Bearer ", "");

      if (!token) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "No token provided" };
      }

      const verification = await authService.verifyToken(token);

      if (!verification.valid) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return { success: false, message: "Invalid token" };
      }

      set.status = HTTP_STATUS.OK;
      return {
        success: true,
        userId: verification.userId,
      };
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Get current user",
        description: "Get the current authenticated user",
      },
    }
  );
