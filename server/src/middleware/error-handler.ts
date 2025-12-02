/**
 * @author Recipio Team
 * @description Global error handler middleware for ElysiaJS
 */

import { Elysia } from "elysia";

export const errorHandler = new Elysia().onError(({ code, error, set }) => {
  console.error(`[Error] ${code}:`, error);

  switch (code) {
    case "VALIDATION":
      return {
        success: false,
        message: "Validation error",
        errors: error.validator?.Errors(error.value) || [],
      };
    case "NOT_FOUND":
      return {
        success: false,
        message: "Resource not found",
      };
    case "INTERNAL_SERVER_ERROR":
      return {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: error.message }),
      };
    default:
      return {
        success: false,
        message: error.message || "An error occurred",
      };
  }
});

