/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Request logging middleware
 */

import { Elysia } from "elysia";
import { HTTP_STATUS } from "../utils/constants";

export const logger = new Elysia()
  .derive(() => {
    const start = Date.now();
    return { startTime: start };
  })
  .onAfterHandle(({ request, response, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const status =
      response instanceof Response ? response.status : HTTP_STATUS.OK;
    const duration = startTime !== undefined ? Date.now() - startTime : 0;

    console.log(
      `[${new Date().toISOString()}] ${method} ${
        url.pathname
      } ${status} ${duration}ms`
    );
  })
  .onError(({ request, error, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const duration = startTime !== undefined ? Date.now() - startTime : 0;
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error";

    console.error(
      `[${new Date().toISOString()}] ${method} ${
        url.pathname
      } ERROR: ${errorMessage} ${duration}ms`
    );
  });
