/**
 * @author Recipio Team
 * @description Request logging middleware for ElysiaJS
 */

import { Elysia } from 'elysia';

export const logger = new Elysia()
  .derive(({ request }) => {
    const start = Date.now();
    return { startTime: start };
  })
  .onAfterHandle(({ request, response, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const status = response instanceof Response ? response.status : 200;
    const duration = Date.now() - startTime;

    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname} ${status} ${duration}ms`);
  })
  .onError(({ request, error, startTime }) => {
    const method = request.method;
    const url = new URL(request.url);
    const duration = Date.now() - startTime;

    console.error(`[${new Date().toISOString()}] ${method} ${url.pathname} ERROR: ${error.message} ${duration}ms`);
  });

