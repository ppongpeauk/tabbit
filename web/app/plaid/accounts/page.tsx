/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description View linked Plaid bank accounts
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getAccounts, type PlaidAccount } from "@/utils/api";

export default function PlaidAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
      loadAccounts(token);
    }
  }, [user, isLoading, searchParams, router]);

  const loadAccounts = async (token: string) => {
    setIsLoadingAccounts(true);
    setError(null);
    try {
      const response = await getAccounts(token);
      if (response.success && response.data) {
        setAccounts(response.data.accounts);
        setItemId(response.data.item.item_id);
      } else {
        setError(response.message || "Failed to load accounts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleLoadAccounts = () => {
    if (!accessToken) {
      setError("Please provide an access token");
      return;
    }
    loadAccounts(accessToken);
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

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
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Bank Accounts</h1>
          <p className="text-gray-600">View your linked bank accounts</p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/plaid"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Link Account
          </Link>
          {accessToken && (
            <Link
              href={`/plaid/transactions?token=${encodeURIComponent(
                accessToken
              )}`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View Transactions →
            </Link>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!accessToken && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-2">
              Access Token Required
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Please provide an access token to view accounts. You can get one
              by linking a bank account.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter access token"
                value={accessToken || ""}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleLoadAccounts}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Load Accounts
              </button>
            </div>
          </div>
        )}

        {itemId && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600">
              Item ID: <span className="font-mono">{itemId}</span>
            </p>
          </div>
        )}

        {isLoadingAccounts && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading accounts...</p>
          </div>
        )}

        {accounts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {accounts.length} Account{accounts.length !== 1 ? "s" : ""}
            </h2>
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{account.name}</h3>
                    {account.official_name && (
                      <p className="text-sm text-gray-600">
                        {account.official_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {account.type} • {account.subtype || "N/A"}
                      {account.mask && ` • •••• ${account.mask}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(account.balances.available)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Current</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(account.balances.current)}
                    </p>
                  </div>
                  {account.balances.limit !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Limit</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(account.balances.limit)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-mono">
                    Account ID: {account.account_id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingAccounts && accounts.length === 0 && accessToken && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-600">No accounts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
