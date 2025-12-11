import moment from "moment";

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: "USD")
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  // Validate and sanitize currency code
  // Currency codes must be 3 uppercase letters (ISO 4217)
  const normalizedCurrency =
    currency && typeof currency === "string" && currency.trim().length === 3
      ? currency.trim().toUpperCase()
      : "USD";

  // Validate currency code by attempting to create a formatter
  // If it fails, fall back to USD
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    });
    return formatter.format(amount);
  } catch {
    // Fallback to USD if currency is invalid
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}

/**
 * Format a timestamp as a full date with time
 * @param timestamp - ISO timestamp string
 * @returns Formatted date string (e.g., "Jan 15, 2024, 3:45 PM")
 */
export function formatDate(
  timestamp: string,
  includeTime: boolean = true
): string {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: includeTime ? "numeric" : undefined,
      minute: includeTime ? "2-digit" : undefined,
    }).format(date);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a timestamp as a relative date (Today, Yesterday, X days ago, or formatted date)
 * @param timestamp - ISO timestamp string
 * @returns Relative date string (e.g., "Today", "Yesterday", "3 days ago", or "Jan 15")
 */
export function formatRelativeDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "Today";
  } else if (diffDays === 2) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }
}

/**
 * Format a timestamp as time (for today's receipts) or date (for older receipts)
 * @param timestamp - ISO timestamp string
 * @param isToday - Whether the receipt is from today
 * @returns Time string (e.g., "3:45 PM") or date string (e.g., "Jan 15")
 */
export function formatReceiptDateTime(
  timestamp: string,
  isToday: boolean
): string {
  const date = new Date(timestamp);

  if (isToday) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } else {
    const now = new Date();
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }
}

/**
 * Format a date string using moment.js
 * @param dateString - Date string (ISO format, YYYY-MM-DD, or other formats)
 * @param format - Moment.js format string (default: "MMM D, YYYY")
 * @returns Formatted date string
 */
export function formatDateWithMoment(
  dateString: string,
  format: string = "MMM D, YYYY"
): string {
  if (!dateString) return "";
  const date = moment(dateString);
  if (!date.isValid()) return dateString; // Return original if invalid
  return date.format(format);
}

/**
 * Format a return by date with moment.js
 * Shows relative time if within 7 days, otherwise formatted date
 * @param dateString - Date string (ISO format or YYYY-MM-DD)
 * @returns Formatted date string (e.g., "in 3 days", "Jan 15, 2024")
 */
export function formatReturnByDate(dateString: string): string {
  if (!dateString) return "";
  const date = moment(dateString);
  if (!date.isValid()) return dateString; // Return original if invalid

  const now = moment();
  const daysDiff = date.diff(now, "days");

  // If within 7 days, show relative time
  if (daysDiff >= 0 && daysDiff <= 7) {
    return date.fromNow(); // e.g., "in 3 days"
  }

  // Otherwise show formatted date
  return date.format("MMM D, YYYY"); // e.g., "Jan 15, 2024"
}
