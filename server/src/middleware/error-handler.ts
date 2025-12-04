/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Global error handler middleware
 */

import { Elysia } from "elysia";
import { HTTP_STATUS } from "../utils/constants";

export const errorHandler = new Elysia().onError(({ code, error, set }) => {
  console.error(`[Error] ${code}:`, error);

  switch (code) {
    case "VALIDATION":
      set.status = HTTP_STATUS.BAD_REQUEST;
      return {
        success: false,
        message: "Validation error",
        errors: error.validator?.Errors(error.value) || [],
      };
    case "NOT_FOUND":
      set.status = HTTP_STATUS.NOT_FOUND;
      return {
        success: false,
        message: "Resource not found",
      };
    case "INTERNAL_SERVER_ERROR":
      set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: error.message }),
      };
    default:
      set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "An error occurred",
      };
  }
});
