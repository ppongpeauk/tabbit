/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Subscription status checking service using RevenueCat API
 */

import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";

const REVENUECAT_SECRET_KEY = env.REVENUECAT_SECRET_KEY || "";
const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
const ENTITLEMENT_ID = "Tabbit Pro";

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: {
      [key: string]: {
        expires_date?: string | null;
        product_identifier?: string;
        purchase_date?: string;
      };
    };
  };
}

async function checkRevenueCatSubscription(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_KEY) {
    return false;
  }

  try {
    const response = await fetch(
      `${REVENUECAT_API_BASE}/subscribers/${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      console.error(
        `[SubscriptionService] RevenueCat API error: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const data = (await response.json()) as RevenueCatSubscriberResponse;

    const entitlements = data.subscriber?.entitlements;
    if (!entitlements || !entitlements[ENTITLEMENT_ID]) {
      return false;
    }

    const entitlement = entitlements[ENTITLEMENT_ID];
    if (!entitlement.expires_date) {
      return true;
    }

    const expiresDate = new Date(entitlement.expires_date);
    return expiresDate > new Date();
  } catch (error) {
    console.error(
      "[SubscriptionService] Error checking RevenueCat subscription:",
      error
    );
    return false;
  }
}

export class SubscriptionService {
  async isProUser(userId: string): Promise<boolean> {
    if (env.DISABLE_LIMITS) {
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPro: true,
        subscriptionExpiresAt: true,
        subscriptionUpdatedAt: true,
      },
    });

    if (!user) {
      return false;
    }

    if (!user.isPro) {
      return false;
    }

    if (user.subscriptionExpiresAt) {
      const expiresDate = new Date(user.subscriptionExpiresAt);
      if (expiresDate <= new Date()) {
        await this.updateSubscriptionStatus(userId, false, null);
        return false;
      }
    }

    const cacheAge = user.subscriptionUpdatedAt
      ? Date.now() - new Date(user.subscriptionUpdatedAt).getTime()
      : Infinity;

    if (cacheAge > 5 * 60 * 1000) {
      const isPro = await checkRevenueCatSubscription(userId);
      await this.updateSubscriptionStatus(
        userId,
        isPro,
        isPro ? await this.getExpirationDate(userId) : null
      );
      return isPro;
    }

    return user.isPro;
  }

  async updateSubscriptionStatus(
    userId: string,
    isPro: boolean,
    expiresAt: Date | null
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPro,
        subscriptionExpiresAt: expiresAt,
        subscriptionUpdatedAt: new Date(),
      },
    });
  }

  async getExpirationDate(userId: string): Promise<Date | null> {
    if (!REVENUECAT_SECRET_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `${REVENUECAT_API_BASE}/subscribers/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as RevenueCatSubscriberResponse;
      const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID];

      if (!entitlement?.expires_date) {
        return null;
      }

      return new Date(entitlement.expires_date);
    } catch (error) {
      console.error(
        "[SubscriptionService] Error getting expiration date:",
        error
      );
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
