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
  }
): Promise<ReceiptScanResponse> {
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

    // Make API request
    const response = await fetch(`${API_BASE_URL}/receipts/scan-base64`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

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
    return data as ReceiptScanResponse;
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
