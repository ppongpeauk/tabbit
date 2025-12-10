/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description OAuth utilities for Google authentication
 */

import { API_BASE_URL } from "./config";

/**
 * Get Google OAuth Web Client ID from server
 * This is used to configure @react-native-google-signin/google-signin
 */
export async function getGoogleClientId(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/google/config`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || "Failed to get Google OAuth configuration"
    );
  }

  const data = await response.json();
  if (!data.success || !data.clientId) {
    throw new Error("Invalid response from server");
  }

  return data.clientId;
}
