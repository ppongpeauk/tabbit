/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description OAuth callback handler for Better Auth
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/utils/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Better Auth handles the callback automatically via cookies
        // We just need to wait a moment for the session to be established
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if we have a session
        const session = await authClient.getSession();
        if (session?.data?.user) {
          // Redirect to home page after successful auth
          router.push("/");
        } else {
          // If no session, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=callback_failed");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
