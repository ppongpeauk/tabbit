/**
 * Get the API base URL
 * For development, defaults to localhost:3000
 * Can be overridden with EXPO_PUBLIC_API_URL environment variable
 */
const DEFAULT_LOCAL_PORT = 3001;
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
    return `http://localhost:${DEFAULT_LOCAL_PORT}`;
  } else if (process.env.EXPO_OS === "android") {
    return `http://10.0.2.2:${DEFAULT_LOCAL_PORT}`;
  }

  // Fallback to localhost
  return `http://localhost:${DEFAULT_LOCAL_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Animation configuration constants
 * Used for consistent animation timing across UI components
 */
export const AnimationConfig = {
  /** Fast animation duration for quick interactions (e.g., button presses, selections) */
  fast: 120,
  /** Standard animation duration for most UI transitions */
  standard: 200,
  /** Slow animation duration for complex or attention-grabbing animations */
  slow: 300,
} as const;
