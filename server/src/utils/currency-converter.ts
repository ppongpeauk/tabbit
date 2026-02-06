import { Converter } from "easy-currencies";
import type { StoredReceiptData } from "../modules/receipt/model.js";

// Create a single converter instance to reuse
const converter = new Converter();

/**
 * Convert a number value from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (!Number.isFinite(amount) || amount === 0) {
    return amount;
  }

  try {
    const result = await converter.convert(amount, fromCurrency, toCurrency);
    return result;
  } catch (error) {
    console.error("[CurrencyConverter] Conversion failed:", {
      amount,
      fromCurrency,
      toCurrency,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Convert all monetary values in a receipt from one currency to another
 */
export async function convertReceiptCurrency(
  receipt: StoredReceiptData,
  toCurrency: string
): Promise<StoredReceiptData> {
  const fromCurrency = receipt.totals.currency;

  if (fromCurrency === toCurrency) {
    return receipt;
  }

  console.log("[CurrencyConverter] Converting receipt currency:", {
    fromCurrency,
    toCurrency,
  });

  const convert = async (amount: number | undefined | null): Promise<number> => {
    if (amount == null || !Number.isFinite(amount)) {
      return amount ?? 0;
    }
    return convertAmount(amount, fromCurrency, toCurrency);
  };

  const [
    subtotal,
    tax,
    fees,
    total,
    amountPaid,
    changeDue,
  ] = await Promise.all([
    convert(receipt.totals.subtotal),
    convert(receipt.totals.tax),
    convert(receipt.totals.fees),
    convert(receipt.totals.total),
    convert(receipt.totals.amountPaid),
    convert(receipt.totals.changeDue),
  ]);

  const taxBreakdown = receipt.totals.taxBreakdown
    ? await Promise.all(
        receipt.totals.taxBreakdown.map(async (item) => ({
          ...item,
          amount: await convert(item.amount),
        }))
      )
    : undefined;

  const feesBreakdown = receipt.totals.feesBreakdown
    ? await Promise.all(
        receipt.totals.feesBreakdown.map(async (item) => ({
          ...item,
          amount: await convert(item.amount),
        }))
      )
    : undefined;

  const items = await Promise.all(
    receipt.items.map(async (item) => ({
      ...item,
      unitPrice: await convert(item.unitPrice),
      totalPrice: await convert(item.totalPrice),
    }))
  );

  const convertedReceipt: StoredReceiptData = {
    ...receipt,
    items,
    totals: {
      ...receipt.totals,
      currency: toCurrency,
      subtotal,
      tax,
      taxBreakdown,
      fees,
      feesBreakdown,
      total,
      amountPaid,
      changeDue,
    },
  };

  console.log("[CurrencyConverter] Receipt converted successfully:", {
    fromCurrency,
    toCurrency,
    newTotal: convertedReceipt.totals.total,
  });

  return convertedReceipt;
}
