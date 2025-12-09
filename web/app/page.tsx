/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Home page with authentication
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HomeLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-xl hover:underline underline-offset-4 transition-colors"
    >
      {children}
    </Link>
  );
}

export default function Home() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <Image
          src="/tabbit.png"
          className="mx-auto mb-4"
          alt="Tabbit"
          width={100}
          height={100}
        />
        <h1 className="text-3xl font-bold">Tabbit Functional Demo</h1>
        <p className="text-gray-600">
          Welcome back, {user.name || user.email}!
        </p>

        <div className="space-y-4">
          <HomeLink href="/scan">Scan a receipt</HomeLink>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
