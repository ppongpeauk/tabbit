/**
 * @author Recipio Team
 * @description Receipt data models and validation schemas
 */

import { t } from "elysia";

export const merchantAddressSchema = t.Object({
  line1: t.Optional(t.String()),
  city: t.Optional(t.String()),
  state: t.Optional(t.String()),
  postalCode: t.Optional(t.String()),
  country: t.Optional(t.String()),
});

export const merchantSchema = t.Object({
  merchantId: t.Optional(t.String()),
  name: t.String(),
  address: t.Optional(merchantAddressSchema),
  phone: t.Optional(t.String()),
  receiptNumber: t.Optional(t.String()),
});

export const paymentDetailsSchema = t.Object({
  cardType: t.Optional(t.String()),
  last4: t.Optional(t.String()),
  network: t.Optional(t.String()),
  authCode: t.Optional(t.String()),
});

export const transactionSchema = t.Object({
  datetime: t.String(),
  timezone: t.Optional(t.String()),
  transactionId: t.Optional(t.String()),
  registerId: t.Optional(t.String()),
  cashierId: t.Optional(t.String()),
  paymentMethod: t.Optional(t.String()),
  paymentDetails: t.Optional(paymentDetailsSchema),
});

export const taxBreakdownItemSchema = t.Object({
  label: t.String(),
  amount: t.Number(),
});

export const totalsSchema = t.Object({
  currency: t.String(),
  subtotal: t.Number(),
  tax: t.Number(),
  taxBreakdown: t.Optional(t.Array(taxBreakdownItemSchema)),
  total: t.Number(),
  amountPaid: t.Optional(t.Number()),
  changeDue: t.Optional(t.Number()),
});

export const receiptItemSchema = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  sku: t.Optional(t.String()),
  category: t.Optional(t.String()),
  quantity: t.Number(),
  unitPrice: t.Number(),
  totalPrice: t.Number(),
});

export const returnInfoSchema = t.Object({
  returnPolicyText: t.Optional(t.String()),
  returnByDate: t.Optional(t.String()),
  returnBarcode: t.Optional(t.String()),
  hasReturnBarcode: t.Optional(t.Boolean()),
});

export const receiptImageSchema = t.Object({
  url: t.String(),
  type: t.String(),
});

export const appDataSchema = t.Object({
  tags: t.Optional(t.Array(t.String())),
  userNotes: t.Optional(t.String()),
  images: t.Optional(t.Array(receiptImageSchema)),
  emoji: t.Optional(t.String()),
});

export const originalImageSchema = t.Object({
  url: t.String(),
  width: t.Optional(t.Number()),
  height: t.Optional(t.Number()),
});

export const technicalSchema = t.Object({
  source: t.Optional(t.String()),
  originalImage: t.Optional(originalImageSchema),
  merchantDetectionConfidence: t.Optional(t.Number()),
});

export const receiptSchema = t.Object({
  id: t.Optional(t.String()),
  merchant: merchantSchema,
  transaction: transactionSchema,
  items: t.Array(receiptItemSchema),
  totals: totalsSchema,
  returnInfo: t.Optional(returnInfoSchema),
  appData: t.Optional(appDataSchema),
  technical: t.Optional(technicalSchema),
});

export type ReceiptItem = typeof receiptItemSchema.static;
export type Receipt = typeof receiptSchema.static;

export interface Barcode {
  type: string;
  content: string;
}

export interface ReceiptResponse {
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

export const defaultReceiptSchema = {
  id: "string",
  merchant: {
    merchantId: "string",
    name: "string",
    address: {
      line1: "string",
      city: "string",
      state: "string",
      postalCode: "string",
      country: "string",
    },
    phone: "string",
    receiptNumber: "string",
  },
  transaction: {
    datetime: "string",
    timezone: "string",
    transactionId: "string",
    registerId: "string",
    cashierId: "string",
    paymentMethod: "string",
    paymentDetails: {
      cardType: "string",
      last4: "string",
      network: "string",
      authCode: "string",
    },
  },
  items: [
    {
      id: "string",
      name: "string",
      sku: "string",
      category: "string",
      quantity: "number",
      unitPrice: "number",
      totalPrice: "number",
    },
  ],
  totals: {
    currency: "string",
    subtotal: "number",
    tax: "number",
    taxBreakdown: [
      {
        label: "string",
        amount: "number",
      },
    ],
    total: "number",
    amountPaid: "number",
    changeDue: "number",
  },
  returnInfo: {
    returnPolicyText: "string",
    returnByDate: "string",
    returnBarcode: "string",
    hasReturnBarcode: "boolean",
  },
  appData: {
    tags: ["string"],
    userNotes: "string",
    emoji: "string",
    images: [
      {
        url: "string",
        type: "string",
      },
    ],
  },
  technical: {
    source: "string",
    originalImage: {
      url: "string",
      width: "number",
      height: "number",
    },
    merchantDetectionConfidence: "number",
  },
};
