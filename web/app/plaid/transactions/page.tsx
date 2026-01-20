/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description View Plaid transactions
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getTransactions, type PlaidTransaction } from "@/utils/api";

function PlaidTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [count, setCount] = useState<number>(100);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
      loadTransactions(token);
    }
  }, [user, isLoading, searchParams, router]);

  const loadTransactions = async (token: string) => {
    setIsLoadingTransactions(true);
    setError(null);
    try {
      const response = await getTransactions(token, {
        startDate,
        endDate,
        count,
        offset,
      });
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        setTotalTransactions(response.data.total_transactions);
      } else {
        setError(response.message || "Failed to load transactions");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions"
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleLoadTransactions = () => {
    if (!accessToken) {
      setError("Please provide an access token");
      return;
    }
    loadTransactions(accessToken);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Transactions</h1>
          <p className="text-gray-600">View your bank account transactions</p>
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
              href={`/plaid/accounts?token=${encodeURIComponent(accessToken)}`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View Accounts →
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
              Please provide an access token to view transactions. You can get
              one by linking a bank account.
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
                onClick={handleLoadTransactions}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Load Transactions
              </button>
            </div>
          </div>
        )}

        {accessToken && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Filter Transactions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Count
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Offset
                </label>
                <input
                  type="number"
                  value={offset}
                  onChange={(e) => setOffset(Number(e.target.value))}
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <button
              onClick={handleLoadTransactions}
              disabled={isLoadingTransactions}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingTransactions ? "Loading..." : "Load Transactions"}
            </button>
          </div>
        )}

        {isLoadingTransactions && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading transactions...</p>
          </div>
        )}

        {totalTransactions > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-600">
              Showing {transactions.length} of {totalTransactions} transactions
            </p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {transactions.length} Transaction
              {transactions.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.transaction_id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{transaction.name}</h3>
                        {transaction.merchant_name && (
                          <span className="text-xs text-gray-500">
                            @ {transaction.merchant_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(transaction.date)}
                        {transaction.authorized_date &&
                          transaction.authorized_date !== transaction.date && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Authorized:{" "}
                              {formatDate(transaction.authorized_date)})
                            </span>
                          )}
                      </p>
                      {transaction.category &&
                        transaction.category.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {transaction.category.map((cat, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      {transaction.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[
                            transaction.location.city,
                            transaction.location.region,
                            transaction.location.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.amount < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {transaction.amount < 0 ? "-" : "+"}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-mono">
                      Transaction ID: {transaction.transaction_id}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      Account ID: {transaction.account_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoadingTransactions && transactions.length === 0 && accessToken && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-600">
              No transactions found for this period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlaidTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PlaidTransactionsContent />
    </Suspense>
  );
}
