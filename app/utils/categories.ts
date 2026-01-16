const CATEGORY_NAME_MAP: Record<string, string> = {
  INCOME: "Income",
  LOAN_DISBURSEMENTS: "Loan Disbursements",
  LOAN_PAYMENTS: "Loan Payments",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  BANK_FEES: "Bank Fees",
  ENTERTAINMENT: "Entertainment",
  FOOD_AND_DRINK: "Food & Drink",
  GENERAL_MERCHANDISE: "General Merchandise",
  HOME_IMPROVEMENT: "Home Improvement",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "General Services",
  GOVERNMENT_AND_NON_PROFIT: "Government & Non-Profit",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Rent & Utilities",
  OTHER: "Other",
};

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  Income: "💰",
  "Loan Disbursements": "💵",
  "Loan Payments": "💳",
  "Transfer In": "⬇️",
  "Transfer Out": "⬆️",
  "Bank Fees": "💸",
  Entertainment: "🎬",
  "Food & Drink": "🍽️",
  "General Merchandise": "🛍️",
  "Home Improvement": "🔨",
  Medical: "🏥",
  "Personal Care": "💆",
  "General Services": "🔧",
  "Government & Non-Profit": "🏛️",
  Transportation: "🚗",
  Travel: "✈️",
  "Rent & Utilities": "🏠",
  Other: "📋",
};

export function getCategoryName(category: string): string {
  if (!category) return "Other";
  return CATEGORY_NAME_MAP[category] || category;
}

export function getCategoryEmoji(category: string): string {
  if (!category) return "📋";

  const formattedName = CATEGORY_NAME_MAP[category] || category;
  return CATEGORY_EMOJI_MAP[formattedName] || "📋";
}
