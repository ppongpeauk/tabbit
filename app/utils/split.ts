import type { StoredReceipt } from "./storage";

export enum SplitStrategy {
  EQUAL = "equal",
  ITEMIZED = "itemized",
  PERCENTAGE = "percentage",
  CUSTOM = "custom",
}

export interface ItemAssignment {
  itemId: string;
  friendIds: string[];
  quantities?: number[]; // Optional: quantities per friend (for partial quantities)
}

export enum SplitStatus {
  PENDING = "pending",
  SETTLED = "settled",
  PARTIAL = "partial",
}

export interface SplitData {
  strategy: SplitStrategy;
  assignments: ItemAssignment[];
  friendShares: Record<string, number>; // friendId -> base amount
  taxDistribution: Record<string, number>; // friendId -> tax amount
  tipDistribution?: Record<string, number>; // friendId -> tip amount
  totals: Record<string, number>; // friendId -> total owed
  people?: Record<string, string>; // friendId -> display name
  statuses?: Record<string, SplitStatus>; // friendId -> status
  settledAmounts?: Record<string, number>; // friendId -> amount settled
}

/**
 * Calculate equal split among friends
 */
export function calculateEqualSplit(
  total: number,
  friendIds: string[]
): Record<string, number> {
  if (friendIds.length === 0) return {};
  const amountPerFriend = total / friendIds.length;
  const result: Record<string, number> = {};
  friendIds.forEach((id) => {
    result[id] = amountPerFriend;
  });
  return roundAmounts(result, total);
}

/**
 * Calculate percentage-based split among friends
 */
export function calculatePercentageSplit(
  total: number,
  friendIds: string[],
  percentages: Record<string, number>
): Record<string, number> {
  if (friendIds.length === 0) return {};
  const result: Record<string, number> = {};
  friendIds.forEach((id) => {
    const percentage = percentages[id] || 0;
    result[id] = (total * percentage) / 100;
  });
  return roundAmounts(result, total);
}

/**
 * Calculate itemized split based on item assignments
 */
export function calculateItemizedSplit(
  receipt: StoredReceipt,
  assignments: ItemAssignment[]
): Record<string, number> {
  const friendShares: Record<string, number> = {};

  // Initialize all friend shares to 0
  const allFriendIds = new Set<string>();
  assignments.forEach((assignment) => {
    assignment.friendIds.forEach((id) => allFriendIds.add(id));
  });
  allFriendIds.forEach((id) => {
    friendShares[id] = 0;
  });

  // Calculate shares based on item assignments
  assignments.forEach((assignment) => {
    const item = receipt.items.find((i) => {
      // Try to match by id if available, otherwise by index
      if (i.id) return i.id === assignment.itemId;
      const itemIndex = receipt.items.findIndex((it) => it === i);
      return assignment.itemId === itemIndex.toString();
    });

    if (!item) return;

    const itemTotal = item.totalPrice;
    const friendCount = assignment.friendIds.length;

    if (friendCount === 0) return;

    // If quantities are specified, use them for proportional split
    if (assignment.quantities && assignment.quantities.length === friendCount) {
      const totalQuantity = assignment.quantities.reduce(
        (sum, qty) => sum + qty,
        0
      );
      if (totalQuantity > 0) {
        assignment.friendIds.forEach((friendId, index) => {
          const quantity = assignment.quantities![index];
          const share = (itemTotal * quantity) / totalQuantity;
          friendShares[friendId] = (friendShares[friendId] || 0) + share;
        });
      }
    } else {
      // Equal split among assigned friends
      const sharePerFriend = itemTotal / friendCount;
      assignment.friendIds.forEach((friendId) => {
        friendShares[friendId] = (friendShares[friendId] || 0) + sharePerFriend;
      });
    }
  });

  // Round amounts to ensure they sum to subtotal
  const subtotal = receipt.totals.subtotal;
  return roundAmounts(friendShares, subtotal);
}

/**
 * Calculate proportional tax and tip distribution based on base shares
 */
export function calculateProportionalTaxTip(
  baseShares: Record<string, number>,
  tax: number,
  tip?: number
): {
  taxDistribution: Record<string, number>;
  tipDistribution?: Record<string, number>;
} {
  const totalBase = Object.values(baseShares).reduce(
    (sum, amount) => sum + amount,
    0
  );

  if (totalBase === 0) {
    const friendIds = Object.keys(baseShares);
    const taxPerFriend = tax / friendIds.length;
    const tipPerFriend = tip ? tip / friendIds.length : undefined;

    const taxDist: Record<string, number> = {};
    const tipDist: Record<string, number> | undefined = tip ? {} : undefined;

    friendIds.forEach((id) => {
      taxDist[id] = taxPerFriend;
      if (tipDist && tipPerFriend !== undefined) {
        tipDist[id] = tipPerFriend;
      }
    });

    return {
      taxDistribution: roundAmounts(taxDist, tax),
      tipDistribution: tipDist && tip ? roundAmounts(tipDist, tip) : undefined,
    };
  }

  // Calculate percentage of total for each friend
  const taxDistribution: Record<string, number> = {};
  const tipDistribution: Record<string, number> | undefined = tip
    ? {}
    : undefined;

  Object.keys(baseShares).forEach((friendId) => {
    const percentage = baseShares[friendId] / totalBase;
    taxDistribution[friendId] = tax * percentage;
    if (tipDistribution && tip !== undefined) {
      tipDistribution[friendId] = tip * percentage;
    }
  });

  return {
    taxDistribution: roundAmounts(taxDistribution, tax),
    tipDistribution:
      tipDistribution && tip ? roundAmounts(tipDistribution, tip) : undefined,
  };
}

/**
 * Round amounts to 2 decimal places and ensure they sum to the target total
 * Distributes rounding differences to the largest amounts
 */
export function roundAmounts(
  amounts: Record<string, number>,
  targetTotal: number
): Record<string, number> {
  const rounded: Record<string, number> = {};
  let roundedSum = 0;

  // Round each amount to 2 decimal places
  Object.keys(amounts).forEach((key) => {
    rounded[key] = Math.round(amounts[key] * 100) / 100;
    roundedSum += rounded[key];
  });

  // Calculate difference
  const difference = targetTotal - roundedSum;
  const tolerance = 0.01; // Allow 1 cent tolerance

  if (Math.abs(difference) > tolerance) {
    // Distribute difference to largest amounts
    const sortedEntries = Object.entries(rounded).sort((a, b) => b[1] - a[1]);
    const diffInCents = Math.round(difference * 100);
    const absDiff = Math.abs(diffInCents);
    const sign = diffInCents > 0 ? 1 : -1;

    // Distribute the difference
    for (let i = 0; i < absDiff && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i];
      rounded[key] = Math.round((rounded[key] + sign * 0.01) * 100) / 100;
    }
  }

  return rounded;
}

/**
 * Main calculation function for splitting a receipt
 */
export function calculateSplit(
  receipt: StoredReceipt,
  strategy: SplitStrategy,
  assignments: ItemAssignment[],
  friendIds: string[]
): SplitData {
  let friendShares: Record<string, number> = {};
  const tax = receipt.totals.tax || 0;
  const tip = receipt.totals.total - receipt.totals.subtotal - tax; // Tip is remainder after subtotal + tax
  const hasTip = tip > 0.01; // Consider tip if more than 1 cent

  // Calculate base shares based on strategy
  switch (strategy) {
    case SplitStrategy.EQUAL:
      friendShares = calculateEqualSplit(receipt.totals.subtotal, friendIds);
      break;
    case SplitStrategy.ITEMIZED:
      friendShares = calculateItemizedSplit(receipt, assignments);
      break;
    case SplitStrategy.PERCENTAGE:
      // For percentage, friendShares should be calculated from percentages provided in assignments
      // This will be handled by the UI component
      friendIds.forEach((id) => {
        friendShares[id] = 0;
      });
      break;
    case SplitStrategy.CUSTOM:
      // For custom, friendShares should be provided in assignments or calculated separately
      // This will be handled by the UI component
      friendIds.forEach((id) => {
        friendShares[id] = 0;
      });
      break;
  }

  // Calculate proportional tax and tip distribution
  const { taxDistribution, tipDistribution } = calculateProportionalTaxTip(
    friendShares,
    tax,
    hasTip ? tip : undefined
  );

  // Calculate totals per friend
  const totals: Record<string, number> = {};
  friendIds.forEach((friendId) => {
    totals[friendId] =
      (friendShares[friendId] || 0) +
      (taxDistribution[friendId] || 0) +
      (tipDistribution?.[friendId] || 0);
  });

  // Round totals to ensure they sum to receipt total
  const receiptTotal = receipt.totals.total;
  const roundedTotals = roundAmounts(totals, receiptTotal);

  return {
    strategy,
    assignments,
    friendShares,
    taxDistribution,
    tipDistribution: hasTip ? tipDistribution : undefined,
    totals: roundedTotals,
  };
}

/**
 * Validate split assignments
 */
export function validateSplit(
  receipt: StoredReceipt,
  strategy: SplitStrategy,
  assignments: ItemAssignment[],
  friendIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (friendIds.length === 0) {
    errors.push("At least one friend must be selected");
  }

  if (strategy === SplitStrategy.ITEMIZED) {
    // Check that all items are assigned
    const assignedItemIds = new Set(assignments.map((a) => a.itemId));
    receipt.items.forEach((item, index) => {
      const itemId = item.id || index.toString();
      if (!assignedItemIds.has(itemId)) {
        errors.push(`Item "${item.name}" is not assigned to anyone`);
      }
    });

    // Check quantities don't exceed item quantities
    assignments.forEach((assignment) => {
      const item = receipt.items.find((i) => {
        if (i.id) return i.id === assignment.itemId;
        const itemIndex = receipt.items.findIndex((it) => it === i);
        return assignment.itemId === itemIndex.toString();
      });

      if (!item) return;

      if (assignment.quantities) {
        const totalQuantity = assignment.quantities.reduce(
          (sum, qty) => sum + qty,
          0
        );
        if (totalQuantity > item.quantity) {
          errors.push(
            `Item "${item.name}": assigned quantities (${totalQuantity}) exceed item quantity (${item.quantity})`
          );
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
