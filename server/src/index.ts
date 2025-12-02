/**
 * @author Recipio Team
 * @description Main entry point for the ElysiaJS server application
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { authModule } from "./modules/auth";
import { userModule } from "./modules/user";
import { receiptModule } from "./modules/receipt";
import { cacheService } from "./utils/cache";

// Initialize cache service
cacheService.connect().catch((error) => {
  console.error("[App] Failed to initialize cache:", error);
});

const app = new Elysia()
  .use(
    swagger({
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
          { name: "barcodes", description: "Barcode and QR code detection endpoints" },
        ],
      },
    })
  )
  .use(cors())
  .use(logger)
  .use(errorHandler)
  .get("/", () => ({
    message: "Recipio API Server",
    version: "1.0.0",
    status: "running",
  }))
  .use(authModule)
  .use(userModule)
  .use(receiptModule)
  .listen(process.env.PORT ?? 3000);

console.log(
  `🦊 Server is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
