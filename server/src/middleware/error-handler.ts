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
      const validationErrors =
        error &&
        typeof error === "object" &&
        "validator" in error &&
        error.validator &&
        typeof error.validator === "object" &&
        "Errors" in error.validator &&
        typeof error.validator.Errors === "function"
          ? error.validator.Errors(
              "value" in error && error.value !== undefined
                ? error.value
                : undefined
            )
          : [];
      return {
        success: false,
        message: "Validation error",
        errors: validationErrors,
      };
    case "NOT_FOUND":
      set.status = HTTP_STATUS.NOT_FOUND;
      return {
        success: false,
        message: "Resource not found",
      };
    case "INTERNAL_SERVER_ERROR":
      set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : undefined;
      return {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" &&
          errorMessage && { error: errorMessage }),
      };
    default:
      set.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const defaultMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "An error occurred";
      return {
        success: false,
        message: defaultMessage,
      };
  }
});
