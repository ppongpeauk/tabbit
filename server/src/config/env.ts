/**
 * @author Recipio Team
 * @description Environment configuration and validation
 */

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
  REDIS_URL: process.env.REDIS_URL,
  DISABLE_IMAGE_CACHE: process.env.DISABLE_IMAGE_CACHE === "true",
} as const;

export function validateEnv(): void {
  const required = ["JWT_SECRET"];

  if (env.NODE_ENV === "production") {
    required.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    });
  }
}

