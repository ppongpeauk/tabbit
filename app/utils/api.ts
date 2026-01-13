import { File } from "expo-file-system";
import { API_BASE_URL } from "./config";

export interface MerchantAddress {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Merchant {
  merchantId?: string;
  name: string;
  address?: MerchantAddress;
  phone?: string;
  receiptNumber?: string;
  logo?: string; // Merchant logo URL from Plaid Enrich
  website?: string; // Merchant website from Plaid Enrich
  category?: string[]; // Merchant categories from Plaid Enrich
}

export interface PaymentDetails {
  cardType?: string;
  last4?: string;
  network?: string;
  authCode?: string;
}

export interface Transaction {
  datetime: string;
  timezone?: string;
  transactionId?: string;
  registerId?: string;
  cashierId?: string;
  paymentMethod?: string;
  paymentDetails?: PaymentDetails;
}

export interface TaxBreakdownItem {
  label: string;
  amount: number;
}

export interface Totals {
  currency: string;
  subtotal: number;
  tax: number;
  taxBreakdown?: TaxBreakdownItem[];
  total: number;
  amountPaid?: number;
  changeDue?: number;
}

export interface ReceiptItem {
  id?: string;
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReturnInfo {
  returnPolicyText?: string[] | string;
  returnPolicyRawText?: string;
  returnByDate?: string;
  exchangeByDate?: string;
  returnBarcode?: string;
  returnBarcodeFormat?: string;
  hasReturnBarcode?: boolean;
}

export interface ReceiptImage {
  url: string;
  type: string;
}

export interface AppData {
  tags?: string[];
  userNotes?: string;
  emoji?: string;
  images?: ReceiptImage[];
}

export interface OriginalImage {
  url: string;
  width?: number;
  height?: number;
}

export interface Technical {
  source?: string;
  originalImage?: OriginalImage;
  merchantDetectionConfidence?: number;
}

export interface Receipt {
  id?: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  appData?: AppData;
  technical?: Technical;
}

export interface Barcode {
  type: string;
  content: string;
}

export interface ReceiptScanResponse {
  success: boolean;
  receipt?: Receipt;
  barcodes?: Barcode[];
  message?: string;
  error?: string;
  raw_response?: string;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
  authError?: boolean;
}

/**
 * Convert image URI to base64 string
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    // Use new expo-file-system File API
    const file = new File(uri);
    // Use the built-in base64() method
    return await file.base64();
  } catch (error) {
    throw new Error(
      `Failed to read image file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Scan a receipt image using the server API
 * @param imageUri - Local file URI of the image
 * @param options - Optional scan options
 * @returns Receipt scan response
 */
/**
 * Scan a barcode image using the server API
 * @param imageUri - Local file URI of the image
 * @returns Barcode scan response
 */
export async function scanBarcodeImage(imageUri: string): Promise<{
  success: boolean;
  barcodes?: Barcode[];
  count?: number;
  message?: string;
  error?: string;
}> {
  try {
    // Convert image URI to base64
    const imageBase64 = await imageUriToBase64(imageUri);

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/receipts/barcodes/scan-base64`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: imageBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message:
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to scan barcode. Please check your connection and try again.",
      error: error instanceof Error ? error.stack : undefined,
    };
  }
}

/**
 * Scan a receipt image using the server API
 * @param imageUri - Local file URI of the image
 * @param options - Optional scan options
 * @returns Receipt scan response
 */
export async function scanReceipt(
  imageUri: string,
  options?: {
    model?: string;
    skipPreprocessing?: boolean;
    token?: string;
  }
): Promise<
  ReceiptScanResponse & { authError?: boolean }
> {
  try {
    // Convert image URI to base64
    const imageBase64 = await imageUriToBase64(imageUri);

    // Prepare request body
    const body: Record<string, unknown> = {
      image_base64: imageBase64,
    };

    if (options?.model) {
      body.model = options.model;
    }

    if (options?.skipPreprocessing !== undefined) {
      body.skip_preprocessing = options.skipPreprocessing;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token if provided
    if (options?.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    // Make API request
    const response = await fetch(`${API_BASE_URL}/receipts/scan-base64`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));

      const isAuthError =
        response.status === 401 ||
        errorData.message?.toLowerCase().includes("session expired");

      return {
        success: false,
        message:
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
        authError: isAuthError,
      };
    }

    const data = await response.json();
    return data as ReceiptScanResponse & {
      authError?: boolean;
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to scan receipt. Please check your connection and try again.",
      error: error instanceof Error ? error.stack : undefined,
    };
  }
}

// Group types
export interface GroupMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  code: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

export interface GroupResponse {
  success: boolean;
  message?: string;
  group?: Group;
  groups?: Group[];
}

export interface PresignedUploadResponse {
  success: boolean;
  message?: string;
  uploadUrl?: string;
  fields?: Record<string, string>;
  key?: string;
}

export interface PresignedUrlResponse {
  success: boolean;
  message?: string;
  url?: string;
}

/**
 * Get auth token from secure storage
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { getItemAsync } = await import("expo-secure-store");
    return await getItemAsync("tabbit.token");
  } catch {
    return null;
  }
}

/**
 * Get all groups for the authenticated user
 */
export async function getGroups(): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch groups. Please check your connection and try again.",
    };
  }
}

/**
 * Get a group by ID
 */
export async function getGroup(groupId: string): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch group. Please check your connection and try again.",
    };
  }
}

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string;
  description?: string;
}): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create group. Please check your connection and try again.",
    };
  }
}

/**
 * Join a group by code
 */
export async function joinGroup(code: string): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to join group. Please check your connection and try again.",
    };
  }
}

/**
 * Update a group
 */
export async function updateGroup(
  groupId: string,
  data: { name?: string; description?: string }
): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update group. Please check your connection and try again.",
    };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to leave group. Please check your connection and try again.",
    };
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete group. Please check your connection and try again.",
    };
  }
}

/**
 * Get presigned POST URL for uploading group icon
 */
export async function getGroupIconUploadUrl(
  groupId: string,
  extension: string = "jpg"
): Promise<PresignedUploadResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(
      `${API_BASE_URL}/groups/${groupId}/icon/presigned`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ extension }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get upload URL. Please check your connection and try again.",
    };
  }
}

/**
 * Confirm icon upload and update group
 */
export async function confirmGroupIconUpload(
  groupId: string,
  key: string
): Promise<GroupResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    const response = await fetch(
      `${API_BASE_URL}/groups/${groupId}/icon/confirm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to confirm icon upload. Please check your connection and try again.",
    };
  }
}

/**
 * Upload image file to presigned POST URL
 */
export async function uploadImageToPresignedUrl(
  uploadUrl: string,
  fields: Record<string, string>,
  fileUri: string,
  contentType: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();

    // Append all presigned POST fields first
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Content-Type must be a field (not just on the file) for S3 presigned POST policy
    if (!fields["Content-Type"]) {
      formData.append("Content-Type", contentType);
    }

    const filename = fileUri.split("/").pop() || "image.jpg";
    formData.append("file", {
      uri: fileUri,
      type: contentType,
      name: filename,
    } as unknown as Blob);

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => "");
      return {
        success: false,
        message: `Upload failed: ${uploadResponse.status} ${
          uploadResponse.statusText
        }${errorText ? ` - ${errorText}` : ""}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please check your connection and try again.",
    };
  }
}

/**
 * Get presigned URL for viewing an image
 */
export async function getPresignedUrl(
  key: string
): Promise<PresignedUrlResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, message: "Not authenticated" };
    }

    // URL-encode the key to handle special characters
    const encodedKey = encodeURIComponent(key);

    const response = await fetch(
      `${API_BASE_URL}/groups/presigned/${encodedKey}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return {
        success: false,
        message: errorData.message || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get image URL. Please check your connection and try again.",
    };
  }
}
