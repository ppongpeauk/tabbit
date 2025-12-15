/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Plaid client initialization and configuration
 */

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { env } from "../config/env";

/**
 * Initialize Plaid client configuration
 */
const configuration = new Configuration({
  basePath:
    env.PLAID_ENV === "production"
      ? PlaidEnvironments.production
      : env.PLAID_ENV === "development"
      ? PlaidEnvironments.development
      : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
      "PLAID-SECRET": env.PLAID_SECRET,
    },
  },
});

/**
 * Plaid API client instance
 */
export const plaidClient = new PlaidApi(configuration);

/**
 * Get Plaid environment
 */
export function getPlaidEnv(): "sandbox" | "development" | "production" {
  return env.PLAID_ENV as "sandbox" | "development" | "production";
}
