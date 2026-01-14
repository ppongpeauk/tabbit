/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Plaid integration routes for bank account linking
 */

import { Elysia } from "elysia";
import { plaidService } from "./service";
import {
  createLinkTokenSchema,
  exchangePublicTokenSchema,
  getAccountsSchema,
  getTransactionsSchema,
  getItemSchema,
  removeItemSchema,
} from "./model";
import { HTTP_STATUS } from "../../utils/constants";
import { unauthorizedResponse } from "../../utils/route-helpers";
import { auth } from "../../lib/auth";

export const plaidModule = new Elysia({ prefix: "/plaid" })
  .derive(async ({ request }) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      return { user: session?.user || null };
    } catch {
      return { user: null };
    }
  })
  .post(
    "/link-token",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.createLinkToken({
        userId: user.id,
        clientName: body.clientName,
        countryCodes: body.countryCodes,
        language: body.language,
        products: body.products,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: createLinkTokenSchema,
      detail: {
        tags: ["plaid"],
        summary: "Create Plaid link token",
        description:
          "Creates a link token for Plaid Link to initiate bank account connection",
      },
    }
  )
  .post(
    "/exchange-token",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.exchangePublicToken({
        publicToken: body.publicToken,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: exchangePublicTokenSchema,
      detail: {
        tags: ["plaid"],
        summary: "Exchange public token for access token",
        description:
          "Exchanges a public token from Plaid Link for a permanent access token",
      },
    }
  )
  .post(
    "/accounts",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.getAccounts({
        accessToken: body.accessToken,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: getAccountsSchema,
      detail: {
        tags: ["plaid"],
        summary: "Get accounts",
        description:
          "Retrieves account information for a connected bank account",
      },
    }
  )
  .post(
    "/transactions",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.getTransactions({
        accessToken: body.accessToken,
        startDate: body.startDate,
        endDate: body.endDate,
        count: body.count,
        offset: body.offset,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: getTransactionsSchema,
      detail: {
        tags: ["plaid"],
        summary: "Get transactions",
        description:
          "Retrieves transaction history for a connected bank account",
      },
    }
  )
  .post(
    "/item",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.getItem({
        accessToken: body.accessToken,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: getItemSchema,
      detail: {
        tags: ["plaid"],
        summary: "Get item information",
        description: "Retrieves information about a connected Plaid item",
      },
    }
  )
  .post(
    "/item/remove",
    async ({ body, set, user }) => {
      if (!user) {
        set.status = HTTP_STATUS.UNAUTHORIZED;
        return unauthorizedResponse();
      }

      const result = await plaidService.removeItem({
        accessToken: body.accessToken,
      });

      set.status = result.success
        ? HTTP_STATUS.OK
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;

      return result;
    },
    {
      body: removeItemSchema,
      detail: {
        tags: ["plaid"],
        summary: "Remove item",
        description: "Disconnects a bank account (removes Plaid item)",
      },
    }
  );
