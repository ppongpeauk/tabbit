/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Prisma configuration file for migrations and database connection
 */

// Load environment variables from .env file
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
