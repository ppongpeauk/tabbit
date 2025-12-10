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
import { limitModule } from "./modules/limits";
import { subscriptionModule } from "./modules/subscription";
import { groupModule } from "./modules/group";
import { syncModule } from "./modules/sync";
import { cacheService } from "./utils/cache";
import { env } from "./config/env";
import { betterAuth, authModule } from "./modules/auth";
import { prisma, pool } from "./lib/prisma";

cacheService.connect().catch((error) => {
  console.error("[App] Failed to initialize cache:", error);
});

const shutdown = async (signal: string) => {
  console.log(`\n[App] Received ${signal}, shutting down gracefully...`);

  try {
    await cacheService.disconnect();
    console.log("[App] Cache disconnected");

    await prisma.$disconnect();
    console.log("[App] Database disconnected");

    await pool.end();
    console.log("[App] Database pool closed");

    process.exit(0);
  } catch (error) {
    console.error("[App] Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      provider: "scalar",
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
          { name: "limits", description: "Limit checking endpoints" },
          {
            name: "subscription",
            description: "Subscription management endpoints",
          },
          {
            name: "groups",
            description: "Group management endpoints",
          },
          {
            name: "sync",
            description: "Receipt sync endpoints (Pro feature)",
          },
        ],
      },
    })
  )
  .use(betterAuth)
  .use(
    cors({
      origin: [
        "http://localhost:3000", // Web app
        "http://localhost:8081", // Web app alternative port
        "http://localhost:3001", // Server itself
        /^https?:\/\/.*\.railway\.app$/, // Production deployments
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      credentials: true, // Required for Better Auth cookies
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cookie",
        "Set-Cookie",
        "X-Requested-With",
      ],
    })
  )
  .use(logger)
  .use(errorHandler)
  .use(authModule)
  .use(userModule)
  .use(receiptModule)
  .use(limitModule)
  .use(subscriptionModule)
  .use(groupModule)
  .use(syncModule)
  .get("/user", ({ user }) => user, {
    auth: true,
  })
  .listen(env.PORT);

console.log(
  `🦊 Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
