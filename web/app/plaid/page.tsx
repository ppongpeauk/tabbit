/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Main Plaid test page - link bank accounts
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/contexts/auth-context";
import {
  createLinkToken,
  exchangePublicToken,
  type CreateLinkTokenResponse,
} from "@/utils/api";

export default function PlaidPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load link token on mount
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && !linkToken && !isLoadingToken) {
      loadLinkToken();
    }
  }, [user, isLoading, linkToken, isLoadingToken, router]);

  const loadLinkToken = async () => {
    setIsLoadingToken(true);
    setError(null);
    try {
      const response: CreateLinkTokenResponse = await createLinkToken();
      if (response.success && response.data) {
        setLinkToken(response.data.linkToken);
      } else {
        setError(response.message || "Failed to create link token");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load link token"
      );
    } finally {
      setIsLoadingToken(false);
    }
  };

  const onSuccess = useCallback(async (publicToken: string) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await exchangePublicToken(publicToken);
      if (response.success && response.data) {
        setAccessToken(response.data.accessToken);
        setSuccess(
          `Successfully linked bank account! Item ID: ${response.data.itemId}`
        );
        // Reload link token for potential additional accounts
        await loadLinkToken();
      } else {
        setError(response.message || "Failed to exchange token");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to exchange token");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => {
      if (err) {
        setError(`Plaid Link error: ${err.error_message || "Unknown error"}`);
      } else if (metadata.exit_status === "user_cancelled") {
        setError(null); // User cancelled, not an error
      }
    },
  });

  if (isLoading || isLoadingToken) {
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
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Link Bank Account</h1>
          <p className="text-gray-600">Connect your bank account using Plaid</p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
            ← Back to Home
          </Link>
          <Link
            href="/plaid/accounts"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View Accounts →
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            {success}
            {accessToken && (
              <div className="mt-2">
                <p className="text-xs text-gray-600">
                  Access Token: {accessToken.substring(0, 20)}...
                </p>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/plaid/accounts?token=${encodeURIComponent(
                      accessToken
                    )}`}
                    className="text-xs text-blue-600 hover:text-blue-500 underline"
                  >
                    View Accounts
                  </Link>
                  <Link
                    href={`/plaid/transactions?token=${encodeURIComponent(
                      accessToken
                    )}`}
                    className="text-xs text-blue-600 hover:text-blue-500 underline"
                  >
                    View Transactions
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Connect Your Bank Account
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Click the button below to securely connect your bank account
                through Plaid. Your credentials are never shared with us.
              </p>
            </div>

            <button
              onClick={() => open()}
              disabled={!ready || !linkToken}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {!ready || !linkToken
                ? "Loading Plaid Link..."
                : "Connect Bank Account"}
            </button>

            {linkToken && (
              <div className="text-xs text-gray-500 mt-2">
                Link token ready. Click to open Plaid Link.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-2">Test Instructions</h3>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Click "Connect Bank Account" to open Plaid Link</li>
            <li>In sandbox mode, use test credentials</li>
            <li>Select a test institution (e.g., "First Platypus Bank")</li>
            <li>
              Use test credentials: username "user_good", password "pass_good"
            </li>
            <li>After linking, you can view accounts and transactions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
