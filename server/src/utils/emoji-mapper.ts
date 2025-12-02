/**
 * @author Recipio Team
 * @description Utility to map receipt categories and merchants to emojis
 */

/**
 * Category to emoji mapping
 */
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  // Core Everyday Categories
  groceries: "🛒",
  "restaurants / food": "🍽️",
  restaurant: "🍽️",
  food: "🍽️",
  "coffee / cafés": "☕",
  coffee: "☕",
  café: "☕",
  cafe: "☕",
  "snacks / convenience store": "🍫",
  snacks: "🍫",
  convenience: "🍫",
  "clothing & apparel": "👕",
  clothing: "👕",
  apparel: "👕",
  shoes: "👟",
  "accessories / jewelry": "💍",
  accessories: "💍",
  jewelry: "💍",
  // Home & Living
  "home goods": "🪑",
  home: "🪑",
  furniture: "🛋️",
  appliances: "🔌",
  "kitchen stuff": "🍳",
  kitchen: "🍳",
  "cleaning supplies": "🧽",
  cleaning: "🧽",
  "bathroom essentials": "🧴",
  bathroom: "🧴",
  // Tech & Electronics
  electronics: "📱",
  "computer parts": "💻",
  computer: "💻",
  "audio gear": "🎧",
  audio: "🎧",
  gaming: "🎮",
  "smart home devices": "🏠✨",
  "smart home": "🏠✨",
  // Transportation
  "gas / fuel": "⛽",
  gas: "⛽",
  fuel: "⛽",
  "rideshare (uber/lyft)": "🚕",
  rideshare: "🚕",
  uber: "🚕",
  lyft: "🚕",
  parking: "🅿️",
  "car maintenance": "🛠️🚗",
  car: "🛠️🚗",
  maintenance: "🛠️🚗",
  // Health & Personal Care
  "medicine / pharmacy": "💊",
  medicine: "💊",
  pharmacy: "💊",
  "vitamins / supplements": "🥼",
  vitamins: "🥼",
  supplements: "🥼",
  skincare: "🧴✨",
  "haircare / grooming": "💇‍♂️",
  haircare: "💇‍♂️",
  grooming: "💇‍♂️",
  "gym / fitness": "🏋️",
  gym: "🏋️",
  fitness: "🏋️",
  // Bills & Subscriptions
  utilities: "💡",
  "phone plan": "📶",
  phone: "📶",
  internet: "🌐",
  "streaming services": "📺",
  streaming: "📺",
  "cloud storage / saas": "☁️",
  cloud: "☁️",
  saas: "☁️",
  insurance: "🛡️",
  // Fun / Non-Essentials
  hobbies: "🎨",
  "music gear": "🎹",
  music: "🎹",
  "concerts / events": "🎟️",
  concerts: "🎟️",
  events: "🎟️",
  movies: "🎬",
  "books / education": "📚",
  books: "📚",
  education: "📚",
  "toys / collectibles": "🎁",
  toys: "🎁",
  collectibles: "🎁",
  // Work & Business
  "office supplies": "🗂️",
  office: "🗂️",
  "software / tools": "🧰",
  software: "🧰",
  tools: "🧰",
  "business expenses": "💼",
  business: "💼",
  "travel (work)": "✈️",
  travel: "✈️",
  // Pets
  "pet food": "🦴",
  "pet supplies": "🐾",
  pets: "🐾",
  "vet visits": "🩺🐶",
  vet: "🩺🐶",
  // Gifts & Charity
  gifts: "🎁",
  donations: "❤️",
  charity: "❤️",
  // Financial
  "bank fees": "💸",
  fees: "💸",
  "cash withdrawal": "🏧",
  cash: "🏧",
  crypto: "🪙",
};

/**
 * Merchant name to emoji mapping (common merchants)
 */
const MERCHANT_EMOJI_MAP: Record<string, string> = {
  // Grocery stores
  target: "🛒",
  walmart: "🛒",
  kroger: "🛒",
  safeway: "🛒",
  "whole foods": "🛒",
  "trader joes": "🛒",
  aldi: "🛒",
  costco: "🛒",
  // Restaurants
  mcdonalds: "🍽️",
  starbucks: "☕",
  dunkin: "☕",
  "dunkin donuts": "☕",
  subway: "🍽️",
  chipotle: "🍽️",
  // Gas stations
  shell: "⛽",
  exxon: "⛽",
  mobil: "⛽",
  bp: "⛽",
  chevron: "⛽",
  // Pharmacies
  cvs: "💊",
  walgreens: "💊",
  riteaid: "💊",
  // Tech stores
  apple: "📱",
  "best buy": "📱",
  microsoft: "💻",
  // Clothing
  nike: "👟",
  adidas: "👟",
  "old navy": "👕",
  gap: "👕",
  // Home improvement
  "home depot": "🪑",
  lowes: "🪑",
  ikea: "🛋️",
};

/**
 * Normalize text for matching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
}

/**
 * Find emoji for a category
 */
function getEmojiForCategory(category: string | undefined): string | undefined {
  if (!category) return undefined;
  const normalized = normalizeText(category);
  return CATEGORY_EMOJI_MAP[normalized];
}

/**
 * Find emoji for a merchant name
 */
function getEmojiForMerchant(merchantName: string): string | undefined {
  const normalized = normalizeText(merchantName);

  // Check exact match first
  if (MERCHANT_EMOJI_MAP[normalized]) {
    return MERCHANT_EMOJI_MAP[normalized];
  }

  // Check partial matches
  for (const [merchant, emoji] of Object.entries(MERCHANT_EMOJI_MAP)) {
    if (normalized.includes(merchant) || merchant.includes(normalized)) {
      return emoji;
    }
  }

  return undefined;
}

/**
 * Determine emoji for a receipt based on merchant name and items
 */
export function getReceiptEmoji(
  merchantName: string,
  items: Array<{ category?: string; name?: string }>
): string {
  // First, try to get emoji from merchant name
  const merchantEmoji = getEmojiForMerchant(merchantName);
  if (merchantEmoji) {
    return merchantEmoji;
  }

  // Then, try to get emoji from item categories
  const categoryEmojis = new Set<string>();
  for (const item of items) {
    if (item.category) {
      const emoji = getEmojiForCategory(item.category);
      if (emoji) {
        categoryEmojis.add(emoji);
      }
    }
  }

  // If we found category emojis, return the first one
  if (categoryEmojis.size > 0) {
    return Array.from(categoryEmojis)[0];
  }

  // Try to infer from item names
  const itemNames = items
    .map((item) => item.name?.toLowerCase() || "")
    .join(" ");

  // Check for common keywords in item names
  if (/\b(coffee|latte|espresso|cappuccino)\b/.test(itemNames)) {
    return "☕";
  }
  if (/\b(burger|pizza|sandwich|taco|burrito|sushi)\b/.test(itemNames)) {
    return "🍽️";
  }
  if (/\b(gas|fuel|petrol)\b/.test(itemNames)) {
    return "⛽";
  }
  if (/\b(medicine|prescription|pharmacy)\b/.test(itemNames)) {
    return "💊";
  }
  if (/\b(clothing|shirt|pants|shoes|sneakers)\b/.test(itemNames)) {
    return "👕";
  }
  if (/\b(groceries|milk|eggs|bread|produce)\b/.test(itemNames)) {
    return "🛒";
  }

  // Default emoji if nothing matches
  return "🧾";
}
