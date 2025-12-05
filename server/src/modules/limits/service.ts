/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Limit tracking service for free plan users
 */

import { prisma } from "@/lib/prisma";
import { subscriptionService } from "../subscription/service";

const MONTHLY_SCAN_LIMIT = 5;
const TOTAL_RECEIPT_LIMIT = 10;

/**
 * Calculate the next month reset date (same day next month)
 */
function getNextMonthResetDate(currentDate: Date = new Date()): Date {
  const nextMonth = new Date(currentDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth;
}

/**
 * Check if a date has passed and needs reset
 */
function needsReset(resetDate: Date): boolean {
  return new Date() >= resetDate;
}

/**
 * Initialize user limits if they don't exist or need reset
 */
async function ensureUserLimits(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      monthlyScansUsed: true,
      monthlyScansResetDate: true,
      totalReceiptsSaved: true,
      receiptsResetDate: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const updates: {
    monthlyScansUsed?: number;
    monthlyScansResetDate?: Date;
    totalReceiptsSaved?: number;
    receiptsResetDate?: Date;
  } = {};

  // Initialize or reset monthly scans if needed
  if (!user.monthlyScansResetDate || needsReset(user.monthlyScansResetDate)) {
    updates.monthlyScansUsed = 0;
    updates.monthlyScansResetDate = getNextMonthResetDate(now);
  }

  // Initialize or reset total receipts if needed (monthly reset)
  if (!user.receiptsResetDate || needsReset(user.receiptsResetDate)) {
    updates.totalReceiptsSaved = 0;
    updates.receiptsResetDate = getNextMonthResetDate(now);
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }
}

export interface LimitStatus {
  monthlyScansUsed: number;
  monthlyScansLimit: number;
  monthlyScansRemaining: number;
  monthlyScansResetDate: Date;
  totalReceiptsSaved: number;
  totalReceiptsLimit: number;
  totalReceiptsRemaining: number;
  receiptsResetDate: Date;
}

export class LimitService {
  /**
   * Get current limit status for a user
   */
  async getLimitStatus(userId: string): Promise<LimitStatus> {
    await ensureUserLimits(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyScansUsed: true,
        monthlyScansResetDate: true,
        totalReceiptsSaved: true,
        receiptsResetDate: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      monthlyScansUsed: user.monthlyScansUsed,
      monthlyScansLimit: MONTHLY_SCAN_LIMIT,
      monthlyScansRemaining: Math.max(
        0,
        MONTHLY_SCAN_LIMIT - user.monthlyScansUsed
      ),
      monthlyScansResetDate: user.monthlyScansResetDate,
      totalReceiptsSaved: user.totalReceiptsSaved,
      totalReceiptsLimit: TOTAL_RECEIPT_LIMIT,
      totalReceiptsRemaining: Math.max(
        0,
        TOTAL_RECEIPT_LIMIT - user.totalReceiptsSaved
      ),
      receiptsResetDate: user.receiptsResetDate,
    };
  }

  async canScan(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);
    if (isPro) {
      return { allowed: true };
    }

    await ensureUserLimits(userId);

    const status = await this.getLimitStatus(userId);

    if (status.monthlyScansRemaining <= 0) {
      const resetDate = new Date(status.monthlyScansResetDate);
      const daysUntilReset = Math.ceil(
        (resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        allowed: false,
        reason: `Monthly scan limit reached. Resets in ${daysUntilReset} day${
          daysUntilReset !== 1 ? "s" : ""
        }.`,
      };
    }

    return { allowed: true };
  }

  async incrementScanCount(userId: string): Promise<void> {
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);
    if (isPro) {
      return;
    }

    await ensureUserLimits(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyScansUsed: {
          increment: 1,
        },
      },
    });
  }

  async canSaveReceipt(
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);
    if (isPro) {
      return { allowed: true };
    }

    await ensureUserLimits(userId);

    const status = await this.getLimitStatus(userId);

    if (status.totalReceiptsRemaining <= 0) {
      const resetDate = new Date(status.receiptsResetDate);
      const daysUntilReset = Math.ceil(
        (resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        allowed: false,
        reason: `Receipt storage limit reached. Resets in ${daysUntilReset} day${
          daysUntilReset !== 1 ? "s" : ""
        }.`,
      };
    }

    return { allowed: true };
  }

  async incrementReceiptCount(userId: string): Promise<void> {
    const isPro = await subscriptionService
      .isProUser(userId)
      .catch(() => false);
    if (isPro) {
      return;
    }

    await ensureUserLimits(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalReceiptsSaved: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Initialize limits for a new user
   */
  async initializeUserLimits(userId: string): Promise<void> {
    const now = new Date();
    const nextMonth = getNextMonthResetDate(now);

    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyScansUsed: 0,
        monthlyScansResetDate: nextMonth,
        totalReceiptsSaved: 0,
        receiptsResetDate: nextMonth,
      },
    });
  }
}

export const limitService = new LimitService();

