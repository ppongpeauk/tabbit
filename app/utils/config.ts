/**
 * Get the API base URL
 * For development, defaults to localhost:3000
 * Can be overridden with EXPO_PUBLIC_API_URL environment variable
 */
const DEFAULT_LOCAL_PORT = 3001;
export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return `http://localhost:${DEFAULT_LOCAL_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

const DEFAULT_WEB_PORT = 3000;
export const getWebBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_WEB_URL) return process.env.EXPO_PUBLIC_WEB_URL;
  return `http://localhost:${DEFAULT_WEB_PORT}`;
};

export const WEB_BASE_URL = getWebBaseUrl();

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
