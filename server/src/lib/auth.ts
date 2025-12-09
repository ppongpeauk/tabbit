/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Better Auth configuration and setup
 */

import { betterAuth, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { resend } from "@/lib/resend";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [bearer()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: User;
      url: string;
      token: string;
    }) => {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: "Verify your email address",
        html: `
          <h1>Verify your email address</h1>
          <p>Click the link below to verify your email:</p>
          <a href="${url}">Verify Email</a>
          <p>Or use this token: ${token}</p>
          <p>This link will expire in 24 hours.</p>
        `,
      });
    },
  },
  passwordReset: {
    enabled: true,
    sendResetPasswordEmail: async ({
      user,
      url,
      token,
    }: {
      user: User;
      url: string;
      token: string;
    }) => {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: "Reset your password",
        html: `
          <h1>Reset your password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}">Reset Password</a>
          <p>Or use this token: ${token}</p>
          <p>This link will expire in 1 hour.</p>
        `,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Better Auth constructs callback URL as: {baseURL}/api/auth/callback/google
      // For web: Google redirects to server, server processes and redirects to web callbackURL
      // For mobile: Google redirects to server, mobile app handles via deep link or token exchange
      redirectURI:
        env.GOOGLE_REDIRECT_URI ||
        `${env.BETTER_AUTH_BASE_URL}/api/auth/callback/google`,
    },
    apple: {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
      redirectURI: env.APPLE_REDIRECT_URI,
      teamId: env.APPLE_TEAM_ID,
      keyId: env.APPLE_KEY_ID,
      privateKey: env.APPLE_PRIVATE_KEY,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_BASE_URL,
  basePath: "/api/auth",
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // 1 day in seconds
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: "better-auth",
    generateId: () => crypto.randomUUID(),
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});
