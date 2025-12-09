/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Request logging middleware - logs all HTTP requests
 */

import { Elysia } from "elysia";
import { HTTP_STATUS } from "../utils/constants";

const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
};

const formatLogMessage = (
  method: string,
  pathname: string,
  status: number,
  duration: number,
  query?: string,
  ip?: string
): string => {
  const timestamp = new Date().toISOString();
  const statusColor =
    status >= 500
      ? "\x1b[31m"
      : status >= 400
      ? "\x1b[33m"
      : status >= 300
      ? "\x1b[36m"
      : "\x1b[32m";
  const reset = "\x1b[0m";

  let message = `[${timestamp}] ${method} ${pathname}`;
  if (query) {
    message += `?${query}`;
  }
  message += ` ${statusColor}${status}${reset} ${duration}ms`;

  if (ip && ip !== "unknown") {
    message += ` [${ip}]`;
  }

  return message;
};

export const logger = new Elysia()
  .derive(() => {
    const start = Date.now();
    return { startTime: start };
  })
  .onAfterHandle(({ request, response, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const query = url.search ? url.search.substring(1) : undefined;
    const status =
      response instanceof Response ? response.status : HTTP_STATUS.OK;
    const duration = startTime !== undefined ? Date.now() - startTime : 0;
    const ip = getClientIP(request);

    console.log(
      formatLogMessage(method, url.pathname, status, duration, query, ip)
    );
  })
  .onError(({ request, error, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const query = url.search ? url.search.substring(1) : undefined;
    const duration = startTime !== undefined ? Date.now() - startTime : 0;
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error";
    const ip = getClientIP(request);

    console.error(
      `[${new Date().toISOString()}] ${method} ${url.pathname}${
        query ? `?${query}` : ""
      } \x1b[31mERROR\x1b[0m: ${errorMessage} ${duration}ms${
        ip && ip !== "unknown" ? ` [${ip}]` : ""
      }`
    );
  });
