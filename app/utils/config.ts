/**
 * Get the API base URL
 * For development, defaults to localhost:3000
 * Can be overridden with EXPO_PUBLIC_API_URL environment variable
 */
export const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Default to localhost for development
  // On iOS simulator, use localhost
  // On Android emulator, use 10.0.2.2
  // On physical device, use your computer's local IP
  if (process.env.EXPO_OS === "ios") {
    return "http://localhost:3000";
  } else if (process.env.EXPO_OS === "android") {
    return "http://10.0.2.2:3000";
  }

  // Fallback to localhost
  return "http://localhost:3000";
};

export const API_BASE_URL = getApiBaseUrl();



