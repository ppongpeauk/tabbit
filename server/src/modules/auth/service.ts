/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication service wrapping Better Auth API
 */

import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/utils/route-helpers";
import { HTTP_STATUS } from "@/utils/constants";

export class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    user?: unknown;
    token?: string;
  }> {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
        },
      });

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Sign up failed",
          HTTP_STATUS.BAD_REQUEST
        ).response;
      }

      const session = result as {
        user?: unknown;
        session?: { token?: string };
      };
      return successResponse({
        user: session.user,
        token: session.session?.token,
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
  }): Promise<{
    success: boolean;
    message?: string;
    user?: unknown;
    token?: string;
  }> {
    try {
      const result = await auth.api.signInEmail({
        body: {
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe ?? true,
        },
      });

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Sign in failed",
          HTTP_STATUS.UNAUTHORIZED
        ).response;
      }

      const session = result as {
        user?: unknown;
        session?: { token?: string };
      };
      return successResponse({
        user: session.user,
        token: session.session?.token,
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

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Sign out failed",
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
      const result = await auth.api.forgetPassword({
        body: {
          email: data.email,
        },
      });

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Failed to send password reset email",
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

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Password reset failed",
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

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Email verification failed",
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

      if (!result || (result as { error?: { message?: string } }).error) {
        const error = (result as { error?: { message?: string } }).error;
        return errorResponse(
          error?.message || "Failed to send verification email",
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
    user?: unknown;
    session?: unknown;
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
}

export const authService = new AuthService();

