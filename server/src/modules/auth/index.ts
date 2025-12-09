import { Elysia, t } from "elysia";
import { authService } from "./service";
import { handleServiceResult } from "../../utils/route-helpers";
import { HTTP_STATUS } from "../../utils/constants";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";

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
    "/google/authorize",
    async ({ query, set }) => {
      try {
        // Return the Better Auth Google OAuth URL
        // Mobile apps can redirect to this, then handle the callback
        const baseURL = env.BETTER_AUTH_BASE_URL || "http://localhost:3001";
        const callbackURL = query.callbackURL as string | undefined;

        // Construct the OAuth URL with optional callback for mobile
        let url = `${baseURL}/api/auth/sign-in/social/google`;
        if (callbackURL) {
          url += `?callbackURL=${encodeURIComponent(callbackURL)}`;
        }

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
              : "Failed to get Google authorization URL",
        };
      }
    },
    {
      query: t.Object({
        callbackURL: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        summary: "Get Google OAuth authorization URL",
        description:
          "Get the URL to redirect users for Google OAuth (for mobile apps)",
      },
    }
  )
  .get(
    "/google/mobile-callback",
    async ({ request, query, set }) => {
      try {
        // This endpoint is called by Better Auth after OAuth completes
        // It generates a temporary code and redirects to the mobile app deep link
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session) {
          set.status = HTTP_STATUS.UNAUTHORIZED;
          return {
            success: false,
            message: "No valid session found",
          };
        }

        // Generate a temporary code
        const code = globalThis.crypto.randomUUID();

        // Store the code in database (expires after 5 minutes via cleanup)
        await prisma.authCode.create({
          data: {
            code,
            userId: session.user.id,
          },
        });

        // Get the callback URL from query (passed from mobile app)
        const callbackURL =
          (query.callbackURL as string) || "tabbit://auth/callback";

        // Redirect to deep link with code
        const redirectURL = `${callbackURL}?code=${code}`;
        set.redirect = redirectURL;
        set.status = HTTP_STATUS.FOUND;
        return;
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Mobile callback failed",
        };
      }
    },
    {
      query: t.Object({
        callbackURL: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        summary: "Mobile OAuth callback handler",
        description:
          "Handles OAuth callback for mobile apps, generates code and redirects to deep link",
      },
    }
  )
  .get(
    "/google/token-exchange",
    async ({ query, set }) => {
      try {
        // Mobile app exchanges a temporary code for bearer token
        // The code is passed in the deep link redirect after OAuth completes
        const code = query.code as string | undefined;

        if (!code) {
          set.status = HTTP_STATUS.BAD_REQUEST;
          return {
            success: false,
            message: "Code parameter is required",
          };
        }

        // Find the temporary auth code in database
        const authCode = await prisma.authCode.findUnique({
          where: { code },
          include: { user: true },
        });

        if (!authCode) {
          set.status = HTTP_STATUS.UNAUTHORIZED;
          return {
            success: false,
            message: "Invalid or expired code",
          };
        }

        // Check if code is expired (5 minutes)
        const now = new Date();
        const codeAge = now.getTime() - authCode.createdAt.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (codeAge > fiveMinutes) {
          // Delete expired code
          await prisma.authCode.delete({ where: { code } });
          set.status = HTTP_STATUS.UNAUTHORIZED;
          return {
            success: false,
            message: "Code has expired",
          };
        }

        // Get the session token for this user
        const dbSession = await prisma.session.findFirst({
          where: {
            userId: authCode.userId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (!dbSession) {
          set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
          return {
            success: false,
            message: "Session token not found",
          };
        }

        // Delete the used code (one-time use)
        await prisma.authCode.delete({ where: { code } });

        set.status = HTTP_STATUS.OK;
        return {
          success: true,
          token: dbSession.token,
          user: authCode.user,
        };
      } catch (error) {
        set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Token exchange failed",
        };
      }
    },
    {
      query: t.Object({
        code: t.String(),
      }),
      detail: {
        tags: ["auth"],
        summary: "Exchange OAuth code for bearer token",
        description:
          "After OAuth completes via deep link, exchange the code for a bearer token (for mobile apps)",
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
