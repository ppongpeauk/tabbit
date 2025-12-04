import { Elysia, t } from "elysia";
import { authService } from "./service";
import { handleServiceResult } from "../../utils/route-helpers";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";

// Better Auth handler (mounts Better Auth's built-in endpoints)
export const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });
        if (!session) return status(401);
        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

// Custom auth endpoints matching client expectations
export const authModule = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({ body, set }) => {
      const result = await authService.signUp(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.CREATED
      );
      set.status = status;
      return response;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        name: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        summary: "Register a new user",
        description: "Create a new user account with email and password",
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const result = await authService.signIn(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.UNAUTHORIZED
      );
      set.status = status;
      return response;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
        rememberMe: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ["auth"],
        summary: "Sign in a user",
        description: "Authenticate a user with email and password",
      },
    }
  )
  .post(
    "/logout",
    async ({ request, set }) => {
      const result = await authService.signOut(request.headers);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Sign out a user",
        description: "Sign out the currently authenticated user",
      },
    }
  )
  .post(
    "/forget-password",
    async ({ body, set }) => {
      const result = await authService.requestPasswordReset(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["auth"],
        summary: "Request password reset",
        description: "Send a password reset email to the user",
      },
    }
  )
  .post(
    "/reset-password",
    async ({ body, set }) => {
      const result = await authService.resetPassword(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      body: t.Object({
        token: t.String(),
        newPassword: t.String({ minLength: 8 }),
      }),
      detail: {
        tags: ["auth"],
        summary: "Reset password",
        description: "Reset user password using the reset token",
      },
    }
  )
  .get(
    "/verify-email",
    async ({ query, set }) => {
      const result = await authService.verifyEmail({ token: query.token });
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      query: t.Object({
        token: t.String(),
      }),
      detail: {
        tags: ["auth"],
        summary: "Verify email",
        description: "Verify user email using the verification token",
      },
    }
  )
  .post(
    "/resend-verification-email",
    async ({ body, set }) => {
      const result = await authService.resendVerificationEmail(body);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK
      );
      set.status = status;
      return response;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["auth"],
        summary: "Resend verification email",
        description: "Resend email verification link to the user",
      },
    }
  )
  .get(
    "/session",
    async ({ request, set }) => {
      const result = await authService.getSession(request.headers);
      const { result: response, status } = handleServiceResult(
        result,
        HTTP_STATUS.OK,
        HTTP_STATUS.UNAUTHORIZED
      );
      set.status = status;
      return response;
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Get current session",
        description: "Get the current authenticated user session",
      },
    }
  );
