/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Main server entry point
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { userModule } from "./modules/user";
import { receiptModule } from "./modules/receipt";
import { cacheService } from "./utils/cache";
import { env } from "./config/env";
import { betterAuth, authModule } from "./modules/auth";

// Initialize cache service
cacheService.connect().catch((error) => {
  console.error("[App] Failed to initialize cache:", error);
});

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      provider: "swagger-ui",
      documentation: {
        info: {
          title: "Tabbit API",
          version: "1.0.0",
          description: "API documentation for Tabbit",
        },
        tags: [
          { name: "auth", description: "Authentication endpoints" },
          { name: "user", description: "User management endpoints" },
          { name: "receipts", description: "Receipt scanning endpoints" },
          {
            name: "barcodes",
            description: "Barcode and QR code detection endpoints",
          },
        ],
      },
    })
  )
  .use(betterAuth)
  .use(
    cors({
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(logger)
  .use(errorHandler)
  .use(authModule)
  .use(userModule)
  .use(receiptModule)
  .get("/user", ({ user }) => user, {
    auth: true,
  })
  .listen(env.PORT);

console.log(
  `🦊 Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
