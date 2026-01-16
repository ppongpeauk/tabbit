import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import axios, { type AxiosInstance, type AxiosError } from "axios";
import { API_BASE_URL } from "./config";
import * as SecureStore from "expo-secure-store";

const TOKEN_STORAGE_KEY = "tabbit.token";

/**
 * Get auth token from secure storage
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Create axios instance with interceptors for auth token
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    async (config) => {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiClient = createAxiosInstance();

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
  url?: string;
  key?: string;
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
  plaidEnrich?: {
    status?: "success" | "failed" | "skipped";
    attemptedAt?: string;
    message?: string;
  };
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
 * Check if image URI is HEIC/HEIF format
 */
function isHeicFormat(uri: string): boolean {
  const lowerUri = uri.toLowerCase();
  return lowerUri.endsWith(".heic") || lowerUri.endsWith(".heif");
}

/**
 * Convert HEIC/HEIF image to JPEG format
 */
async function convertHeicToJpeg(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (error) {
    throw new Error(
      `Failed to convert HEIC image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Convert image URI to base64 string
 * Automatically converts HEIC/HEIF images to JPEG before reading
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  try {
    // Convert HEIC to JPEG if needed
    let imageUri = uri;
    if (isHeicFormat(uri)) {
      console.log("[imageUriToBase64] Converting HEIC to JPEG");
      imageUri = await convertHeicToJpeg(uri);
    }

    // Use new expo-file-system File API
    const file = new File(imageUri);
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
    const response = await apiClient.post("/receipts/barcodes/scan-base64", {
      image_base64: imageBase64,
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to scan barcode. Please check your connection and try again.",
      error: axiosError.stack,
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
): Promise<ReceiptScanResponse & { authError?: boolean }> {
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

    // Create a custom axios instance if token is provided
    const client = options?.token
      ? axios.create({
          baseURL: API_BASE_URL,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.token}`,
          },
        })
      : apiClient;

    // Make API request
    const response = await client.post("/receipts/scan-base64", body);

    return response.data as ReceiptScanResponse & {
      authError?: boolean;
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const isAuthError =
      axiosError.response?.status === 401 ||
      axiosError.response?.data?.message
        ?.toLowerCase()
        .includes("session expired");

    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to scan receipt. Please check your connection and try again.",
      error: axiosError.stack,
      authError: isAuthError,
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
 * Get all groups for the authenticated user
 */
export async function getGroups(): Promise<GroupResponse> {
  try {
    const response = await apiClient.get("/groups");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to fetch groups. Please check your connection and try again.",
    };
  }
}

/**
 * Get a group by ID
 */
export async function getGroup(groupId: string): Promise<GroupResponse> {
  try {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to fetch group. Please check your connection and try again.",
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
    const response = await apiClient.post("/groups", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to create group. Please check your connection and try again.",
    };
  }
}

/**
 * Join a group by code
 */
export async function joinGroup(code: string): Promise<GroupResponse> {
  try {
    const response = await apiClient.post("/groups/join", { code });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to join group. Please check your connection and try again.",
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
    const response = await apiClient.put(`/groups/${groupId}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to update group. Please check your connection and try again.",
    };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<GroupResponse> {
  try {
    const response = await apiClient.post(`/groups/${groupId}/leave`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to leave group. Please check your connection and try again.",
    };
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<GroupResponse> {
  try {
    const response = await apiClient.delete(`/groups/${groupId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to delete group. Please check your connection and try again.",
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
    const response = await apiClient.post(`/groups/${groupId}/icon/presigned`, {
      extension,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to get upload URL. Please check your connection and try again.",
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
    const response = await apiClient.post(`/groups/${groupId}/icon/confirm`, {
      key,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to confirm icon upload. Please check your connection and try again.",
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
    // URL-encode the key to handle special characters
    const encodedKey = encodeURIComponent(key);
    const response = await apiClient.get(`/groups/presigned/${encodedKey}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      message:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to get image URL. Please check your connection and try again.",
    };
  }
}

/**
 * Check if the server is up and responding
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns true if server is up, false otherwise
 */
export async function checkServerHealth(
  timeout: number = 5000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Try to reach the server - use /docs endpoint (swagger) which doesn't require auth
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    // Server is up if we get any HTTP response (even 404 means server is running)
    // Network errors or timeouts mean server is down
    return response.status >= 200 && response.status < 600;
  } catch {
    // Network error, timeout, or other error means server is down
    return false;
  }
}
