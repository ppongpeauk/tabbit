import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AxiosError } from "axios";
import { apiClient, imageUriToBase64 } from "./api";
import type {
  ReceiptItem,
  Merchant,
  Transaction,
  Totals,
  ReturnInfo,
  AppData,
  Technical,
} from "./api";
import type { SplitData } from "./split";
import { SplitStrategy } from "./split";

const FRIENDS_KEY = "@tabbit:friends";
const DEFAULT_SPLIT_MODE_KEY = "@tabbit:default_split_mode";

export interface Friend {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  image?: string | null;
  createdAt: string;
}

export type ReceiptVisibility = "private" | "public";

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
  splitData?: SplitData;
  visibility?: ReceiptVisibility;
  createdAt: string;
  ownerId?: string;
}

// Re-export types for convenience
export type { ReceiptItem } from "./api";

/**
 * Save a new receipt to the server
 */
export async function saveReceipt(
  receipt: Omit<StoredReceipt, "id" | "createdAt">,
  options?: { imageUri?: string }
): Promise<StoredReceipt> {
  try {
    const body: {
      receipt: Omit<StoredReceipt, "id" | "createdAt">;
      image_base64?: string;
    } = { receipt };

    if (options?.imageUri) {
      body.image_base64 = await imageUriToBase64(options.imageUri);
    }

    const response = await apiClient.post("/receipts/save", body);
    const data = response.data;
    if (!data.success || !data.receipt) {
      throw new Error(data.message || "Failed to save receipt");
    }
    return data.receipt as StoredReceipt;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Failed to save receipt"
    );
  }
}

/**
 * Get a presigned URL for a receipt photo
 */
export async function getReceiptPhotoUrl(id: string): Promise<string> {
  try {
    const response = await apiClient.get(`/receipts/${id}/photo-url`);
    const data = response.data;
    if (!data.success || !data.url) {
      throw new Error(data.message || "Failed to load receipt photo");
    }
    return data.url as string;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Failed to load receipt photo"
    );
  }
}

/**
 * Get all receipts from the server
 */
export async function getReceipts(): Promise<StoredReceipt[]> {
  try {
    const response = await apiClient.get("/receipts");
    const data = response.data;
    if (!data.success || !Array.isArray(data.receipts)) {
      throw new Error(data.message || "Failed to fetch receipts");
    }
    return data.receipts as StoredReceipt[];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Failed to fetch receipts"
    );
  }
}

/**
 * Delete a receipt from the server
 */
export async function deleteReceipt(id: string): Promise<void> {
  try {
    const response = await apiClient.delete(`/receipts/${id}`);
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || "Failed to delete receipt");
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Failed to delete receipt"
    );
  }
}

/**
 * Update a receipt on the server
 */
export async function updateReceipt(
  id: string,
  updates: Partial<StoredReceipt>
): Promise<void> {
  try {
    const response = await apiClient.put(`/receipts/${id}`, { updates });
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || "Failed to update receipt");
    }
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Failed to update receipt"
    );
  }
}

/**
 * Save a new friend
 */
export async function saveFriend(
  friend: Omit<Friend, "id" | "createdAt">
): Promise<Friend> {
  const friends = await getFriends();
  const createPersonId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const newFriend: Friend = {
    ...friend,
    id: createPersonId(),
    createdAt: new Date().toISOString(),
  };
  friends.push(newFriend);
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  return newFriend;
}

/**
 * Get all friends
 */
export async function getFriends(): Promise<Friend[]> {
  try {
    const data = await AsyncStorage.getItem(FRIENDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading friends:", error);
    return [];
  }
}

/**
 * Delete a friend by ID
 */
export async function deleteFriend(id: string): Promise<void> {
  const friends = await getFriends();
  const filtered = friends.filter((f) => f.id !== id);
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(filtered));
}

/**
 * Update a friend's information
 */
export async function updateFriend(
  id: string,
  updates: Partial<Friend>
): Promise<void> {
  const friends = await getFriends();
  const index = friends.findIndex((f) => f.id === id);
  if (index !== -1) {
    friends[index] = { ...friends[index], ...updates };
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  }
}

/**
 * Save split data for a receipt
 */
export async function saveSplitData(
  receiptId: string,
  splitData: SplitData
): Promise<void> {
  await updateReceipt(receiptId, { splitData });
}

/**
 * Get split data for a receipt
 */
export async function getSplitData(
  receiptId: string
): Promise<SplitData | null> {
  const receipts = await getReceipts();
  const receipt = receipts.find((r) => r.id === receiptId);
  return receipt?.splitData || null;
}

/**
 * Get the default split mode preference
 */
export async function getDefaultSplitMode(): Promise<SplitStrategy> {
  try {
    const data = await AsyncStorage.getItem(DEFAULT_SPLIT_MODE_KEY);
    if (data) {
      return data as SplitStrategy;
    }
    return SplitStrategy.EQUAL; // Default to EQUAL if not set
  } catch (error) {
    console.error("Error loading default split mode:", error);
    return SplitStrategy.EQUAL;
  }
}

/**
 * Set the default split mode preference
 */
export async function setDefaultSplitMode(mode: SplitStrategy): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFAULT_SPLIT_MODE_KEY, mode);
  } catch (error) {
    console.error("Error saving default split mode:", error);
    throw error;
  }
}

/**
 * Check if a user is a collaborator on a receipt.
 * For now, this temporarily equals checking if the user is the owner.
 * In the future, this will check if the user is in the collaborators list.
 */
export function isCollaborator(
  receipt: StoredReceipt | null | undefined,
  currentUserId?: string | null
): boolean {
  if (!receipt || !currentUserId) {
    return false;
  }
  // Temporarily: collaborator equals owner
  // TODO: In the future, check if user is in receipt.collaborators array
  return Boolean(receipt.ownerId && receipt.ownerId === currentUserId);
}
