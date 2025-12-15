/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Plaid service for bank account integration
 */

import {
  AccountsGetRequest,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  Products,
  TransactionsGetRequest,
  ItemGetRequest,
  ItemRemoveRequest,
} from "plaid";
import { plaidClient } from "../../lib/plaid";
import type {
  CreateLinkTokenDto,
  ExchangePublicTokenDto,
  GetAccountsDto,
  GetTransactionsDto,
  GetItemDto,
  RemoveItemDto,
  PlaidResponse,
} from "./model";

export class PlaidService {
  /**
   * Create a link token for Plaid Link
   */
  async createLinkToken(
    data: CreateLinkTokenDto
  ): Promise<PlaidResponse<{ linkToken: string; expiration: string }>> {
    try {
      const request: LinkTokenCreateRequest = {
        user: {
          client_user_id: data.userId,
        },
        client_name: data.clientName || "Tabbit",
        products: (data.products as Products[]) || [
          Products.Auth,
          Products.Transactions,
        ],
        country_codes: (data.countryCodes as CountryCode[]) || [CountryCode.Us],
        language: (data.language as "en") || "en",
      };

      const response = await plaidClient.linkTokenCreate(request);

      return {
        success: true,
        data: {
          linkToken: response.data.link_token,
          expiration: response.data.expiration || "",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to create link token",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(
    data: ExchangePublicTokenDto
  ): Promise<PlaidResponse<{ accessToken: string; itemId: string }>> {
    try {
      const request: ItemPublicTokenExchangeRequest = {
        public_token: data.publicToken,
      };

      const response = await plaidClient.itemPublicTokenExchange(request);

      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          itemId: response.data.item_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to exchange public token",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get accounts for an access token
   */
  async getAccounts(data: GetAccountsDto): Promise<PlaidResponse> {
    try {
      const request: AccountsGetRequest = {
        access_token: data.accessToken,
      };

      const response = await plaidClient.accountsGet(request);

      return {
        success: true,
        data: {
          accounts: response.data.accounts,
          item: response.data.item,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to get accounts",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get transactions for an access token
   */
  async getTransactions(data: GetTransactionsDto): Promise<PlaidResponse> {
    try {
      const startDate = data.startDate
        ? new Date(data.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
      const endDate = data.endDate ? new Date(data.endDate) : new Date();

      const request: TransactionsGetRequest = {
        access_token: data.accessToken,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        options: {
          count: data.count || 100,
          offset: data.offset || 0,
        },
      };

      const response = await plaidClient.transactionsGet(request);

      return {
        success: true,
        data: {
          transactions: response.data.transactions,
          total_transactions: response.data.total_transactions,
          accounts: response.data.accounts,
          item: response.data.item,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to get transactions",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get item information
   */
  async getItem(data: GetItemDto): Promise<PlaidResponse> {
    try {
      const request: ItemGetRequest = {
        access_token: data.accessToken,
      };

      const response = await plaidClient.itemGet(request);

      return {
        success: true,
        data: {
          item: response.data.item,
          status: response.data.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to get item",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Remove an item (disconnect bank account)
   */
  async removeItem(data: RemoveItemDto): Promise<PlaidResponse> {
    try {
      const request: ItemRemoveRequest = {
        access_token: data.accessToken,
      };

      await plaidClient.itemRemove(request);

      return {
        success: true,
        message: "Item removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to remove item",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const plaidService = new PlaidService();
