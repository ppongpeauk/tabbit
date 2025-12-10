/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication module with Google OAuth
 *
 * IMPORTANT: Google OAuth Configuration
 * - Client uses expo-auth-session to handle OAuth flow with PKCE
 * - Client exchanges authorization code for tokens
 * - Client sends tokens to /auth/google/callback endpoint
 * - Server creates/updates user and returns session token
 * - Redirect URI in Google Cloud Console should be the app's deep link: tabbit://auth/callback
 */

import { Elysia, t } from "elysia";
import { authService } from "./service";
import { handleServiceResult } from "../../utils/route-helpers";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";
import { env } from "../../config/env";

interface GoogleUserResponse {
  id: string;
  email: string;
  name?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

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
  )
  .get(
    "/me",
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
        summary: "Get current user",
        description: "Get the current authenticated user (alias for /session)",
      },
    }
  )
  .get(
    "/google/config",
    async ({ set }) => {
      try {
        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          clientId: env.GOOGLE_CLIENT_ID,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to get Google OAuth configuration",
        };
      }
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Get Google OAuth configuration",
      },
    }
  )
  .post(
    "/google/callback",
    async ({ body, set }) => {
      try {
        const { email, name, googleId, accessToken, idToken } = body as {
          email: string;
          name: string;
          googleId: string;
          accessToken: string;
          idToken?: string;
        };

        // Create/update user and create session
        const result = await authService.signInWithGoogle({
          email,
          name,
          googleId,
          accessToken,
          idToken,
        });

        if (!result.success || !result.token || !result.user) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return {
            success: false,
            message: result.message || "Failed to create session",
          };
        }

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          token: result.token,
          user: result.user,
        };
      } catch (error) {
        console.error("[Google OAuth] Error:", error);
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Google sign in failed",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        name: t.String(),
        googleId: t.String(),
        accessToken: t.String(),
        idToken: t.Optional(t.String()),
        serverAuthCode: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        summary: "Google OAuth callback",
        description:
          "Accepts Google OAuth tokens from client, creates/updates user, and returns session token",
      },
    }
  )
  .post(
    "/apple/callback",
    async ({ body, set }) => {
      try {
        // Handle Apple Sign In callback from native SDK
        // Better Auth expects the callback to be handled via OAuth flow
        // For native Apple Sign In, we need to exchange the identity token
        const result = await authService.signInWithApple(body);
        const { result: response, status } = handleServiceResult(
          result,
          HTTP_STATUS.OK,
          HTTP_STATUS.UNAUTHORIZED
        );
        set.status = status;
        return response;
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Apple sign in failed",
        };
      }
    },
    {
      body: t.Object({
        identityToken: t.String(),
        authorizationCode: t.Optional(t.String()),
        user: t.String(),
        email: t.Optional(t.String()),
        fullName: t.Optional(
          t.Object({
            givenName: t.Optional(t.String()),
            familyName: t.Optional(t.String()),
          })
        ),
      }),
      detail: {
        tags: ["auth"],
        summary: "Apple Sign In callback",
        description: "Handle Apple Sign In callback from native SDK",
      },
    }
  );
