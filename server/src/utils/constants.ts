/**
 * @author Recipio Team
 * @description Application-wide constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const API_VERSION = "v1";

export const DEFAULT_PORT = 3000;

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  ONE_DAY: 86400,
  ONE_HOUR: 3600,
  THIRTY_MINUTES: 1800,
} as const;

