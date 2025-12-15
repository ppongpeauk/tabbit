/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Authentication context for web app
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { authClient, useSession } from "@/utils/auth";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  const signInWithEmail = async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign in failed");
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign up failed");
    }
  };

  const signInWithGoogle = async () => {
    // Better Auth redirects to Google, then back to server callback
    // Server then redirects to callbackURL with session cookie
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/auth/callback`,
    });

    if (result.error) {
      throw new Error(result.error.message || "Google sign in failed");
    }
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || "",
        image: session.user.image,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
