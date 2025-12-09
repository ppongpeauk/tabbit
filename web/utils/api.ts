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
