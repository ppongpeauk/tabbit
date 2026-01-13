export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3001,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
  REDIS_URL: process.env.REDIS_URL,
  DISABLE_IMAGE_CACHE: process.env.DISABLE_IMAGE_CACHE === "true",
  // Better Auth - base URL should point to the server (port 3001), not the web frontend
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_BASE_URL:
    process.env.BETTER_AUTH_BASE_URL || "http://localhost:3001",
  // OAuth - Google
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
  // Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
  // S3 / Railway Buckets
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || "",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "",
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || "auto",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  // Plaid
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID || "",
  PLAID_SECRET: process.env.PLAID_SECRET || "",
  PLAID_ENV: process.env.PLAID_ENV || "sandbox",
} as const;

export function validateEnv(): void {
  const required = ["BETTER_AUTH_SECRET", "DATABASE_URL"];

  if (env.NODE_ENV === "production") {
    required.push("RESEND_API_KEY", "RESEND_FROM_EMAIL");
  }

  required.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

validateEnv();
