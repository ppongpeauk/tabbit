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
