/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description API utility functions for making requests to the backend
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://tabbit.ppkl.dev";

export interface ScanReceiptResponse {
  // Define based on your API response structure
  [key: string]: unknown;
}

/**
 * Scans a receipt by uploading an image file
 * @param imageFile - The image file to scan
 * @param token - Authentication token to be sent as Bearer token
 * @returns Promise with the scanned receipt data
 */
export async function scanReceipt(
  imageFile: File,
  token?: string
): Promise<ScanReceiptResponse> {
  const formData = new FormData();
  formData.append("image", imageFile);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/receipts/scan`, {
    method: "POST",
    headers,
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
