/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description API utility functions for making requests to the backend
 */

import { authClient } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ScanReceiptResponse {
  // Define based on your API response structure
  [key: string]: unknown;
}

/**
 * Get auth token from Better Auth session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await authClient.getSession();
    return session?.data?.session?.token || null;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies for Better Auth
  });
}

/**
 * Scans a receipt by uploading an image file
 * @param imageFile - The image file to scan
 * @returns Promise with the scanned receipt data
 */
export async function scanReceipt(
  imageFile: File
): Promise<ScanReceiptResponse> {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await authenticatedFetch(`${API_BASE_URL}/receipts/scan`, {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const errorJson = await response.json();
      throw new Error(JSON.stringify(errorJson));
    }
    const error = await response.text();
    throw new Error(`Failed to scan receipt: ${error}`);
  }

  return response.json();
}

/**
 * Plaid API types
 */
export interface CreateLinkTokenResponse {
  success: boolean;
  data?: {
    linkToken: string;
    expiration: string;
  };
  message?: string;
  error?: string;
}

export interface ExchangeTokenResponse {
  success: boolean;
  data?: {
    accessToken: string;
    itemId: string;
  };
  message?: string;
  error?: string;
}

export interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
  mask: string | null;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
}

export interface GetAccountsResponse {
  success: boolean;
  data?: {
    accounts: PlaidAccount[];
    item: {
      item_id: string;
      institution_id: string | null;
      webhook: string | null;
      error: unknown | null;
      available_products: string[];
      billed_products: string[];
      consent_expiration_time: string | null;
    };
  };
  message?: string;
  error?: string;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  category_id: string | null;
  authorized_date: string | null;
  location: {
    address: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
  } | null;
  payment_meta: {
    reference_number: string | null;
    ppd_id: string | null;
    payee: string | null;
    payer: string | null;
    payment_method: string | null;
    payment_processor: string | null;
    reason: string | null;
  } | null;
}

export interface GetTransactionsResponse {
  success: boolean;
  data?: {
    transactions: PlaidTransaction[];
    total_transactions: number;
    accounts: PlaidAccount[];
    item: {
      item_id: string;
      institution_id: string | null;
    };
  };
  message?: string;
  error?: string;
}

/**
 * Create a Plaid link token
 */
export async function createLinkToken(): Promise<CreateLinkTokenResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/plaid/link-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create link token");
  }

  return response.json();
}

/**
 * Exchange public token for access token
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<ExchangeTokenResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/plaid/exchange-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicToken }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to exchange token");
  }

  return response.json();
}

/**
 * Get accounts for an access token
 */
export async function getAccounts(
  accessToken: string
): Promise<GetAccountsResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/plaid/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get accounts");
  }

  return response.json();
}

/**
 * Get transactions for an access token
 */
export async function getTransactions(
  accessToken: string,
  options?: {
    startDate?: string;
    endDate?: string;
    count?: number;
    offset?: number;
  }
): Promise<GetTransactionsResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/plaid/transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        ...options,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get transactions");
  }

  return response.json();
}

/**
 * Remove a Plaid item (disconnect bank account)
 */
export async function removePlaidItem(
  accessToken: string
): Promise<{ success: boolean; message?: string }> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/plaid/item/remove`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to remove item");
  }

  return response.json();
}
