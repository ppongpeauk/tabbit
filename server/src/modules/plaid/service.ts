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
  TransactionsEnrichRequest,
  ClientProvidedTransaction,
  EnrichTransactionDirection,
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

  /**
   * Enrich transaction data with merchant information using Plaid Enrich
   * @param transaction - Transaction data from receipt
   * @returns Enriched merchant data (name, logo, address, etc.)
   */
  async enrichTransaction(transaction: {
    id?: string;
    description: string;
    amount: number;
    currency?: string;
    date?: string;
    direction?: "inflow" | "outflow";
    location?: {
      address?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    };
  }): Promise<
    PlaidResponse<{
      merchantName?: string;
      merchantLogo?: string;
      merchantAddress?: {
        line1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      category?: string[];
      website?: string;
    }>
  > {
    console.log("[PlaidService] enrichTransaction called with:", {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,
      direction: transaction.direction,
      hasLocation: !!transaction.location,
      location: transaction.location,
    });

    try {
      const direction =
        transaction.direction === "inflow"
          ? EnrichTransactionDirection.Inflow
          : EnrichTransactionDirection.Outflow;

      console.log("[PlaidService] Mapped direction:", {
        input: transaction.direction,
        output: direction,
      });

      const clientTransaction: ClientProvidedTransaction = {
        id:
          transaction.id ||
          `receipt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: transaction.description,
        amount: transaction.amount,
        direction,
        iso_currency_code: transaction.currency || "USD",
        date_posted: transaction.date || new Date().toISOString().split("T")[0],
      };

      console.log("[PlaidService] Built client transaction:", {
        id: clientTransaction.id,
        description: clientTransaction.description,
        amount: clientTransaction.amount,
        direction: clientTransaction.direction,
        iso_currency_code: clientTransaction.iso_currency_code,
        date_posted: clientTransaction.date_posted,
      });

      // Add location if available
      if (transaction.location) {
        clientTransaction.location = {
          address: transaction.location.address,
          city: transaction.location.city,
          region: transaction.location.region,
          postal_code: transaction.location.postalCode,
          country: transaction.location.country || "US",
        };
        console.log("[PlaidService] Added location to transaction:", clientTransaction.location);
      } else {
        console.log("[PlaidService] No location provided");
      }

      const request: TransactionsEnrichRequest = {
        account_type: "depository",
        transactions: [clientTransaction],
      };

      console.log("[PlaidService] Sending request to Plaid API:", {
        account_type: request.account_type,
        transactionCount: request.transactions.length,
        transaction: {
          id: request.transactions[0].id,
          description: request.transactions[0].description,
          amount: request.transactions[0].amount,
          direction: request.transactions[0].direction,
        },
      });

      const response = await plaidClient.transactionsEnrich(request);

      console.log("[PlaidService] Plaid API response received:", {
        hasEnrichedTransactions: !!response.data.enriched_transactions,
        enrichedTransactionCount: response.data.enriched_transactions?.length || 0,
      });

      if (
        response.data.enriched_transactions &&
        response.data.enriched_transactions.length > 0
      ) {
        const enriched = response.data.enriched_transactions[0];
        console.log("[PlaidService] Processing enriched transaction:", {
          hasEnrichments: !!(enriched as { enrichments?: unknown }).enrichments,
          rawEnriched: JSON.stringify(enriched, null, 2),
        });

        // Type assertion needed as Plaid types may be incomplete
        // The actual structure uses enrichments.merchant_name, enrichments.logo_url, etc.
        const enrichedData = enriched as {
          enrichments?: {
            merchant_name?: string;
            logo_url?: string;
            website?: string;
            location?: {
              address?: string;
              city?: string;
              region?: string;
              postal_code?: string;
              country?: string;
            };
            personal_finance_category?: {
              primary?: string;
              detailed?: string;
            };
          };
        };

        const enrichments = enrichedData.enrichments;

        console.log("[PlaidService] Extracted enrichments:", {
          hasEnrichments: !!enrichments,
          merchantName: enrichments?.merchant_name,
          hasLogo: !!enrichments?.logo_url,
          logoUrl: enrichments?.logo_url,
          hasWebsite: !!enrichments?.website,
          website: enrichments?.website,
          hasLocation: !!enrichments?.location,
          location: enrichments?.location,
          hasCategory: !!enrichments?.personal_finance_category,
          category: enrichments?.personal_finance_category,
        });

        // Build category array from personal_finance_category
        const category: string[] = [];
        if (enrichments?.personal_finance_category?.primary) {
          category.push(enrichments.personal_finance_category.primary);
        }
        if (
          enrichments?.personal_finance_category?.detailed &&
          enrichments.personal_finance_category.detailed !==
            enrichments.personal_finance_category.primary
        ) {
          category.push(enrichments.personal_finance_category.detailed);
        }

        const result = {
          success: true,
          data: {
            merchantName: enrichments?.merchant_name,
            merchantLogo: enrichments?.logo_url,
            merchantAddress: enrichments?.location
              ? {
                  line1: enrichments.location.address,
                  city: enrichments.location.city,
                  state: enrichments.location.region,
                  postalCode: enrichments.location.postal_code,
                  country: enrichments.location.country,
                }
              : undefined,
            category: category.length > 0 ? category : undefined,
            website: enrichments?.website,
          },
        };

        console.log("[PlaidService] Returning enriched data:", {
          hasMerchantName: !!result.data.merchantName,
          hasMerchantLogo: !!result.data.merchantLogo,
          hasMerchantAddress: !!result.data.merchantAddress,
          hasCategory: !!result.data.category,
          hasWebsite: !!result.data.website,
        });

        return result;
      }

      // No enrichment available
      console.log("[PlaidService] No enriched transactions in response");
      return {
        success: true,
        data: {},
      };
    } catch (error) {
      // Don't fail the sync if enrichment fails - just log and continue
      console.error("[PlaidService] ========================================");
      console.error("[PlaidService] ERROR in enrichTransaction:", error);
      console.error("[PlaidService] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        transaction: {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
        },
      });
      console.error("[PlaidService] ========================================");
      return {
        success: false,
        message: "Failed to enrich transaction",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const plaidService = new PlaidService();
