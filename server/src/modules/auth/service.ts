/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication service wrapping Better Auth API
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/utils/route-helpers";
import { HTTP_STATUS } from "@/utils/constants";
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

  async signInWithGoogle(data: {
    email: string;
    name: string;
    googleId: string;
    accessToken: string;
    idToken?: string;
    serverAuthCode?: string;
  }): Promise<AuthResponse> {
    try {
      let user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      const account = await prisma.account.findUnique({
        where: {
          providerId_accountId: {
            providerId: "google",
            accountId: data.googleId,
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
            email: data.email,
            name: data.name || data.email.split("@")[0],
            emailVerified: true,
          },
        });
      } else {
        if (!user.name && data.name) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name: data.name },
          });
        }
      }

      // Create or update account
      await prisma.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "google",
            accountId: data.googleId,
          },
        },
        create: {
          userId: user.id,
          accountId: data.googleId,
          providerId: "google",
          accessToken: data.accessToken,
          idToken: data.idToken || null,
        },
        update: {
          accessToken: data.accessToken,
          idToken: data.idToken || null,
          updatedAt: new Date(),
        },
      });

      const sessionToken = globalThis.crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

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
      console.error("Google sign in error:", error);
      return errorResponse(
        error instanceof Error ? error.message : "Google sign in failed",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ).response;
    }
  }
}

export const authService = new AuthService();
