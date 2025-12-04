import type { StoredReceipt } from "@/utils/storage";

/**
 * Format merchant address as string
 */
export function formatMerchantAddress(
  address: StoredReceipt["merchant"]["address"]
): string | null {
  if (!address) return null;
  return [address.line1, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

/**
 * Format return policy text as bullet points from array
 */
export function formatReturnPolicyBullets(
  returnPolicyText: string[] | string | undefined
): string {
  if (!returnPolicyText) return "";

  // If it's already an array, format as bullet points
  if (Array.isArray(returnPolicyText)) {
    return returnPolicyText.map((item) => `- ${item}`).join("\n");
  }

  // Legacy string format - convert to bullet points
  const lines = returnPolicyText
    .split(/\n|\. |; /)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cleaned = line.replace(/\.$/, "");
      return cleaned.startsWith("-") ? cleaned : `- ${cleaned}`;
    });

  return lines.join("\n");
}

/**
 * Get raw text (prefer returnPolicyRawText, fallback to returnPolicyText)
 */
export function getRawReturnText(
  returnInfo: StoredReceipt["returnInfo"]
): string {
  if (returnInfo?.returnPolicyRawText) {
    return returnInfo.returnPolicyRawText;
  }

  const policyText = returnInfo?.returnPolicyText;
  if (!policyText) return "";

  // If it's an array, join with periods
  if (Array.isArray(policyText)) {
    return policyText.join(". ");
  }

  // If it's a string, return as is
  return policyText;
}

/**
 * Check if we have bullet point data (array format) to toggle with
 */
export function hasBulletPointData(
  returnInfo: StoredReceipt["returnInfo"]
): boolean {
  return Array.isArray(returnInfo?.returnPolicyText);
}

/**
 * Check if return info card should be displayed
 */
export function shouldShowReturnInfo(
  returnInfo: StoredReceipt["returnInfo"]
): boolean {
  if (!returnInfo) return false;

  const hasPolicyText =
    returnInfo.returnPolicyText &&
    (Array.isArray(returnInfo.returnPolicyText)
      ? returnInfo.returnPolicyText.length > 0
      : typeof returnInfo.returnPolicyText === "string" &&
        returnInfo.returnPolicyText.trim().length > 0);
  const hasRawText =
    returnInfo.returnPolicyRawText &&
    typeof returnInfo.returnPolicyRawText === "string" &&
    returnInfo.returnPolicyRawText.trim().length > 0;
  const hasReturnByDate =
    returnInfo.returnByDate &&
    typeof returnInfo.returnByDate === "string" &&
    returnInfo.returnByDate.trim().length > 0;
  const hasExchangeByDate =
    returnInfo.exchangeByDate &&
    typeof returnInfo.exchangeByDate === "string" &&
    returnInfo.exchangeByDate.trim().length > 0;
  const hasReturnBarcode =
    returnInfo.returnBarcode &&
    typeof returnInfo.returnBarcode === "string" &&
    returnInfo.returnBarcode.trim().length > 0;

  return Boolean(
    hasPolicyText || hasRawText || hasReturnByDate || hasExchangeByDate || hasReturnBarcode
  );
}

/**
 * Get card style based on theme
 */
export function getCardStyle(isDark: boolean): {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
} {
  return {
    backgroundColor: isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.02)",
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
  };
}
