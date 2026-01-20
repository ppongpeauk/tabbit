export interface ManualReceiptHeaderFields {
  name: string;
  merchantName: string;
  merchantAddressLine1: string;
  merchantCity: string;
  merchantState: string;
  merchantPostalCode: string;
  merchantCountry: string;
  merchantPhone: string;
  merchantReceiptNumber: string;
  transactionDate: string;
  transactionTime: string;
  currency: string;
  category?: string;
}
