/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Plaid data models and validation schemas
 */

import { t } from "elysia";

/**
 * Create link token request schema
 */
export const createLinkTokenSchema = t.Object({
  userId: t.String(),
  clientName: t.Optional(t.String()),
  countryCodes: t.Optional(t.Array(t.String())),
  language: t.Optional(t.String()),
  products: t.Optional(t.Array(t.String())),
});

/**
 * Exchange public token request schema
 */
export const exchangePublicTokenSchema = t.Object({
  publicToken: t.String(),
});

/**
 * Get accounts request schema
 */
export const getAccountsSchema = t.Object({
  accessToken: t.String(),
});

/**
 * Get transactions request schema
 */
export const getTransactionsSchema = t.Object({
  accessToken: t.String(),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  count: t.Optional(t.Number()),
  offset: t.Optional(t.Number()),
});

/**
 * Get item request schema
 */
export const getItemSchema = t.Object({
  accessToken: t.String(),
});

/**
 * Remove item request schema
 */
export const removeItemSchema = t.Object({
  accessToken: t.String(),
});

/**
 * Type exports
 */
export type CreateLinkTokenDto = typeof createLinkTokenSchema.static;
export type ExchangePublicTokenDto = typeof exchangePublicTokenSchema.static;
export type GetAccountsDto = typeof getAccountsSchema.static;
export type GetTransactionsDto = typeof getTransactionsSchema.static;
export type GetItemDto = typeof getItemSchema.static;
export type RemoveItemDto = typeof removeItemSchema.static;

/**
 * Response types
 */
export interface PlaidResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
