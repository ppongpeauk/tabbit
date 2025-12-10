/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Request logging middleware - logs all HTTP requests with verbose output
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
  .onBeforeHandle(({ request }) => {
    const method = request.method;
    const url = new URL(request.url);
    const ip = getClientIP(request);
    const timestamp = new Date().toISOString();

    console.log(
      `\x1b[36m[${timestamp}] → ${method} ${url.pathname}${
        url.search ? `?${url.search.substring(1)}` : ""
      }\x1b[0m [${ip}]`
    );

    // Log headers in development
    if (process.env.NODE_ENV === "development") {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log(`  Headers:`, JSON.stringify(headers, null, 2));
    }
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

    // Log response details in development
    if (
      process.env.NODE_ENV === "development" &&
      response instanceof Response
    ) {
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log(
        `  Response Headers:`,
        JSON.stringify(responseHeaders, null, 2)
      );
    }
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
    const timestamp = new Date().toISOString();

    console.error(
      `\x1b[31m[${timestamp}] ✗ ${method} ${url.pathname}${
        query ? `?${query}` : ""
      } ERROR\x1b[0m: ${errorMessage} ${duration}ms${
        ip && ip !== "unknown" ? ` [${ip}]` : ""
      }`
    );

    // Log full error in development
    if (process.env.NODE_ENV === "development") {
      console.error("  Error details:", error);
      if (error && typeof error === "object" && "stack" in error) {
        console.error("  Stack:", error.stack);
      }
    }
  });
