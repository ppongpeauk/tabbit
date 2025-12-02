/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Storage utility for persisting receipt data
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const RECEIPTS_KEY = "@recipio:receipts";

import type {
  ReceiptItem,
  Merchant,
  Transaction,
  Totals,
  ReturnInfo,
  AppData,
  Technical,
} from "./api";

export interface StoredReceipt {
  id: string;
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  appData?: AppData;
  technical?: Technical;
  imageUri?: string;
  createdAt: string;
}

// Re-export types for convenience
export type { ReceiptItem } from "./api";

export async function saveReceipt(
  receipt: Omit<StoredReceipt, "id" | "createdAt">
): Promise<StoredReceipt> {
  const receipts = await getReceipts();
  const newReceipt: StoredReceipt = {
    ...receipt,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  receipts.unshift(newReceipt);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  return newReceipt;
}

export async function getReceipts(): Promise<StoredReceipt[]> {
  try {
    const data = await AsyncStorage.getItem(RECEIPTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading receipts:", error);
    return [];
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  const receipts = await getReceipts();
  const filtered = receipts.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(filtered));
}

export async function updateReceipt(
  id: string,
  updates: Partial<StoredReceipt>
): Promise<void> {
  const receipts = await getReceipts();
  const index = receipts.findIndex((r) => r.id === id);
  if (index !== -1) {
    receipts[index] = { ...receipts[index], ...updates };
    await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  }
}





