/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Better Auth client configuration for web
 */

import { createAuthClient } from "better-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Point directly to server - no proxy needed
// Better Auth handles CORS and cookies properly
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include", // Include cookies for session management
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
