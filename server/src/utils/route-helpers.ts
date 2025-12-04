/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Shared route helper utilities
 */

import { HTTP_STATUS } from "./constants";

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

/**
 * Wraps a route handler with error handling
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  defaultStatus: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
): Promise<{ result: T; status: number }> {
  try {
    const result = await handler();
    return { result, status: HTTP_STATUS.OK };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An error occurred";
    return {
      result: {
        success: false,
        message,
      } as T,
      status: defaultStatus,
    };
  }
}

/**
 * Creates a success response
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    ...(message && { message }),
    ...(typeof data === "object" && data !== null ? data : { data }),
  };
}

/**
 * Creates an error response
 */
export function errorResponse(
  message: string,
  status: number = HTTP_STATUS.BAD_REQUEST
): { response: ApiResponse; status: number } {
  return {
    response: {
      success: false,
      message,
    },
    status,
  };
}

/**
 * Handles service result with automatic status code mapping
 */
export function handleServiceResult<T>(
  result: { success: boolean; [key: string]: unknown },
  successStatus: number = HTTP_STATUS.OK,
  errorStatus: number = HTTP_STATUS.BAD_REQUEST
): { result: T; status: number } {
  return {
    result: result as T,
    status: result.success ? successStatus : errorStatus,
  };
}
