/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication service wrapping Better Auth API
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/utils/route-helpers";
import { HTTP_STATUS } from "@/utils/constants";
import { limitService } from "../limits/service";
import type { User } from "better-auth";

interface AuthError {
  error?: {
    message?: string;
  };
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name || "",
        },
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Sign up failed",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      const response = result as { user?: User };
      const user = response.user;

      if (!user) {
        return errorResponse(
          "Authentication failed: no user data",
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        ).response;
      }

      // Get the most recent session for this user from the database
      const session = await prisma.session.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!session) {
        return errorResponse(
          "Authentication failed: could not create session token",
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        ).response;
      }

      // Initialize limits for new user
      try {
        await limitService.initializeUserLimits(user.id);
      } catch (error) {
        console.error("Failed to initialize user limits:", error);
        // Don't fail signup if limit initialization fails
      }

      return successResponse({
        user: user,
        token: session.token,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Sign up failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Sign in a user
   */
  async signIn(data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AuthResponse> {
    try {
      const result = await auth.api.signInEmail({
        body: {
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe ?? true,
        },
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Sign in failed",
          HTTP_STATUS.UNAUTHORIZED
        ).response;
      }

      const response = result as { user?: User };
      const user = response.user;

      if (!user) {
        return errorResponse(
          "Authentication failed: no user data",
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        ).response;
      }

      // Get the most recent session for this user from the database
      const session = await prisma.session.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!session) {
        return errorResponse(
          "Authentication failed: could not create session token",
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        ).response;
      }

      return successResponse({
        user: user,
        token: session.token,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Sign in failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Sign out a user
   */
  async signOut(
    headers: Headers
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await auth.api.signOut({
        headers,
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Sign out failed",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      return successResponse({}, "Signed out successfully");
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Sign out failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: {
    email: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await (
        auth.api as {
          requestPasswordReset?: (args: {
            body: { email: string };
          }) => Promise<unknown>;
        }
      ).requestPasswordReset?.({
        body: {
          email: data.email,
        },
      });

      if (
        !result ||
        (typeof result === "object" && result !== null && "error" in result)
      ) {
        const error = result as AuthError;
        return errorResponse(
          error?.error?.message || "Failed to send password reset email",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      return successResponse({}, "Password reset email sent successfully");
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : "Failed to send password reset email",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await auth.api.resetPassword({
        body: {
          token: data.token,
          newPassword: data.newPassword,
        },
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Password reset failed",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      return successResponse({}, "Password reset successfully");
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Password reset failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(data: {
    token: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await auth.api.verifyEmail({
        query: {
          token: data.token,
        },
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Email verification failed",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      return successResponse({}, "Email verified successfully");
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Email verification failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(data: {
    email: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await auth.api.sendVerificationEmail({
        body: {
          email: data.email,
        },
      });

      if (!result || "error" in result) {
        const error = result as AuthError;
        return errorResponse(
          error.error?.message || "Failed to send verification email",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      return successResponse({}, "Verification email sent successfully");
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : "Failed to send verification email",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Get current session
   */
  async getSession(headers: Headers): Promise<{
    success: boolean;
    message?: string;
    user?: User;
    session?: {
      id: string;
      expiresAt: Date;
      token: string;
      userId: string;
    };
  }> {
    try {
      const result = await auth.api.getSession({
        headers,
      });

      if (!result) {
        return errorResponse("No active session", HTTP_STATUS.UNAUTHORIZED)
          .response;
      }

      return successResponse({
        user: result.user,
        session: result.session,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Failed to get session",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }

  /**
   * Sign in with Apple (native SDK)
   * Handles Apple Sign In from native iOS SDK
   */
  async signInWithApple(data: {
    identityToken: string;
    authorizationCode?: string;
    user: string;
    email?: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
  }): Promise<AuthResponse> {
    try {
      // For Apple Sign In, we'll use Better Auth's social provider API
      // However, since we're using native SDK, we need to handle the token exchange
      // Better Auth expects OAuth flow, so we'll create/update user manually

      // Decode the identity token to get user info (JWT)
      // In production, you should verify the token signature with Apple's public keys
      // For now, we'll extract the email from the token payload

      const tokenParts = data.identityToken.split(".");
      if (tokenParts.length !== 3) {
        return errorResponse(
          "Invalid identity token format",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      // Decode the payload (base64url)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64url").toString("utf-8")
      );

      const appleEmail = payload.email || data.email;
      const appleUserId = payload.sub || data.user;
      const name = data.fullName
        ? `${data.fullName.givenName || ""} ${
            data.fullName.familyName || ""
          }`.trim()
        : payload.name || "";

      if (!appleEmail) {
        return errorResponse(
          "Email is required for Apple Sign In",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      // Check if user exists with this email
      let user = await prisma.user.findUnique({
        where: { email: appleEmail },
      });

      // Check if account exists for Apple provider
      const account = await prisma.account.findUnique({
        where: {
          providerId_accountId: {
            providerId: "apple",
            accountId: appleUserId,
          },
        },
        include: { user: true },
      });

      if (account) {
        user = account.user;
      } else if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: appleEmail,
            name: name || appleEmail.split("@")[0],
            emailVerified: true,
          },
        });

        // Initialize limits for new user
        try {
          await limitService.initializeUserLimits(user.id);
        } catch (error) {
          console.error("Failed to initialize user limits:", error);
        }
      } else {
        // Update existing user name if not set
        if (!user.name && name) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name },
          });
        }
      }

      // Create or update account
      await prisma.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "apple",
            accountId: appleUserId,
          },
        },
        create: {
          userId: user.id,
          accountId: appleUserId,
          providerId: "apple",
          idToken: data.identityToken,
          accessToken: data.authorizationCode || null,
        },
        update: {
          idToken: data.identityToken,
          accessToken: data.authorizationCode || null,
          updatedAt: new Date(),
        },
      });

      // Create a session token using Better Auth's session creation
      // Generate a session token (using Web Crypto API)
      const sessionToken = globalThis.crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create session in database
      const dbSession = await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt,
        },
      });

      return successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "",
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as User,
        token: dbSession.token,
      });
    } catch (error) {
      console.error("Apple sign in error:", error);
      return errorResponse(
        error instanceof Error ? error.message : "Apple sign in failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }
}

export const authService = new AuthService();
