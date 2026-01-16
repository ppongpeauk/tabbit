/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Public receipt API helpers for share links
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  logo?: string;
  website?: string;
  category?: string[];
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

export interface SplitData {
  strategy: string;
  assignments: Array<{
    itemId: string;
    friendIds: string[];
    quantities?: number[];
  }>;
  friendShares: Record<string, number>;
  taxDistribution: Record<string, number>;
  tipDistribution?: Record<string, number>;
  totals: Record<string, number>;
  people?: Record<string, string>;
}

export interface StoredReceipt {
  id: string;
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  appData?: AppData;
  splitData?: SplitData;
  visibility?: "private" | "public";
  createdAt: string;
}

export interface PublicReceiptResponse {
  success: boolean;
  receipt?: StoredReceipt;
  message?: string;
}

export class PublicReceiptNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicReceiptNotFoundError";
  }
}

export async function fetchPublicReceipt(
  receiptId: string
): Promise<StoredReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/public/${receiptId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new PublicReceiptNotFoundError("Receipt not found");
  }

  const data = (await response.json()) as PublicReceiptResponse;

  if (!response.ok || !data.success || !data.receipt) {
    throw new Error(data.message || "Failed to fetch receipt");
  }

  return data.receipt;
}
