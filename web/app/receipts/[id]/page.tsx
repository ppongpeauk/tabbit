/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Public receipt share page
 */

import { notFound } from "next/navigation";
import {
  fetchPublicReceipt,
  PublicReceiptNotFoundError,
  type ReturnInfo,
  type StoredReceipt,
} from "@/utils/public-receipts";
import { MerchantLogo } from "@/components/merchant-logo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatMerchantAddress(
  address: StoredReceipt["merchant"]["address"]
): string | null {
  if (!address) return null;
  return [address.line1, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatReceiptDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatReceiptTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReturnByDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategoryEmoji(category: string): string {
  const categoryMap: Record<string, string> = {
    Shopping: "🛍️",
    Groceries: "🛒",
    "Food & Drink": "🍽️",
    Dining: "🍽️",
    Transportation: "🚗",
    Entertainment: "🎬",
    Travel: "✈️",
    Health: "🏥",
    Services: "🔧",
    Other: "📋",
  };

  return categoryMap[category] || "🛍️";
}

function getReturnPolicyLines(returnInfo?: ReturnInfo): string[] {
  if (!returnInfo) return [];
  const policyText = returnInfo.returnPolicyText;
  if (Array.isArray(policyText)) {
    return policyText.filter((line) => line.trim().length > 0);
  }
  if (typeof policyText === "string" && policyText.trim().length > 0) {
    return policyText
      .split(/\n|\. |; /)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  if (returnInfo.returnPolicyRawText?.trim()) {
    return [returnInfo.returnPolicyRawText.trim()];
  }
  return [];
}

function getPersonLabel(
  personId: string,
  index: number,
  peopleMap?: Record<string, string>
): string {
  if (peopleMap?.[personId]) return peopleMap[personId];
  return `Person ${index + 1}`;
}

function hasReturnInfo(returnInfo?: ReturnInfo): boolean {
  if (!returnInfo) return false;
  const policyLines = getReturnPolicyLines(returnInfo);
  return Boolean(
    policyLines.length > 0 ||
      returnInfo.returnByDate ||
      returnInfo.exchangeByDate ||
      returnInfo.returnBarcode
  );
}

function SplitSummary({ receipt }: { receipt: StoredReceipt }) {
  const splitData = receipt.splitData;
  if (!splitData) return null;

  const totals = Object.keys(splitData.totals);
  const calculatedTotal = Object.values(splitData.totals).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const isValid = Math.abs(calculatedTotal - receipt.totals.total) < 0.01;

  return (
    <div className="rounded-[20px] p-6 border bg-white border-black/5 shadow-sm">
      <div className="text-lg font-bold mb-4">Split Summary</div>
      <div className="space-y-4">
        {totals.map((personId, index) => {
          const baseAmount = splitData.friendShares[personId] || 0;
          const taxAmount = splitData.taxDistribution[personId] || 0;
          const tipAmount = splitData.tipDistribution?.[personId] || 0;
          const total = splitData.totals[personId] || 0;

          return (
            <div
              key={personId}
              className="border-b border-black/10 pb-4 last:border-b-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">
                  {getPersonLabel(personId, index, splitData.people)}
                </div>
                <div className="font-bold">
                  {formatCurrency(total, receipt.totals.currency)}
                </div>
              </div>
              <div className="space-y-1 text-sm text-black/60">
                <div className="flex items-center justify-between">
                  <span>Base</span>
                  <span>
                    {formatCurrency(baseAmount, receipt.totals.currency)}
                  </span>
                </div>
                {taxAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>
                      {formatCurrency(taxAmount, receipt.totals.currency)}
                    </span>
                  </div>
                ) : null}
                {tipAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Tip</span>
                    <span>
                      {formatCurrency(tipAmount, receipt.totals.currency)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-black/10">
        <div className="font-semibold">Total</div>
        <div className={`font-bold ${isValid ? "" : "text-red-600"}`}>
          {formatCurrency(calculatedTotal, receipt.totals.currency)}
        </div>
      </div>
      {!isValid ? (
        <div className="text-xs text-red-600 mt-1">
          Expected:{" "}
          {formatCurrency(receipt.totals.total, receipt.totals.currency)}
        </div>
      ) : null}
    </div>
  );
}

function ItemsCard({ receipt }: { receipt: StoredReceipt }) {
  return (
    <div className="space-y-6">
      {receipt.items.map((item, index) => {
        const itemKey = item.id || `${index}-${item.name}`;
        return (
          <div key={itemKey} className="flex items-start justify-between gap-6">
            <div className="flex-1 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 text-xs font-semibold text-black/60">
                {item.quantity}
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold">{item.name}</div>
                {item.category?.trim() || item.quantity > 1 ? (
                  <div className="text-sm text-black/50">
                    {item.category?.trim() || ""}
                    {item.category?.trim() && item.quantity > 1 ? " • " : ""}
                    {item.quantity > 1
                      ? `${item.quantity} × ${formatCurrency(
                          item.unitPrice,
                          receipt.totals.currency
                        )}`
                      : ""}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="text-base font-semibold text-right">
              {formatCurrency(item.totalPrice, receipt.totals.currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TotalsCard({ receipt }: { receipt: StoredReceipt }) {
  const taxPercentage =
    receipt.totals.subtotal > 0
      ? ((receipt.totals.tax / receipt.totals.subtotal) * 100).toFixed(2)
      : "0";

  return (
    <div className="mt-6">
      <div className="h-px bg-black/10 mb-6" />
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-black/60">
          <span>Subtotal</span>
          <span className="text-black font-semibold">
            {formatCurrency(receipt.totals.subtotal, receipt.totals.currency)}
          </span>
        </div>
        {receipt.totals.taxBreakdown?.length ? (
          receipt.totals.taxBreakdown.map((taxItem, index) => (
            <div
              key={`${taxItem.label}-${index}`}
              className="flex items-center justify-between text-sm text-black/60"
            >
              <span>{taxItem.label}</span>
              <span className="text-black font-semibold">
                {formatCurrency(taxItem.amount, receipt.totals.currency)}
              </span>
            </div>
          ))
        ) : receipt.totals.tax > 0 ? (
          <div className="flex items-center justify-between text-sm text-black/60">
            <span>Tax ({taxPercentage}%)</span>
            <span className="text-black font-semibold">
              {formatCurrency(receipt.totals.tax, receipt.totals.currency)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/10">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold">
            {formatCurrency(receipt.totals.total, receipt.totals.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReturnInfoCard({ receipt }: { receipt: StoredReceipt }) {
  if (!hasReturnInfo(receipt.returnInfo)) return null;

  const lines = getReturnPolicyLines(receipt.returnInfo);

  return (
    <div className="rounded-[20px] p-6 border bg-white border-black/5 shadow-sm">
      <div className="text-lg font-bold mb-3">Return Information</div>
      {lines.length > 0 ? (
        <ul className="text-sm text-black/70 space-y-1 mb-4 list-disc pl-5">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      ) : null}
      {receipt.returnInfo?.returnByDate ? (
        <div className="flex items-center justify-between text-sm py-1">
          <span className="text-black/60">Return By</span>
          <span className="font-semibold">
            {formatReturnByDate(receipt.returnInfo.returnByDate)}
          </span>
        </div>
      ) : null}
      {receipt.returnInfo?.exchangeByDate ? (
        <div className="flex items-center justify-between text-sm py-1">
          <span className="text-black/60">Exchange By</span>
          <span className="font-semibold">
            {formatReturnByDate(receipt.returnInfo.exchangeByDate)}
          </span>
        </div>
      ) : null}
      {receipt.returnInfo?.returnBarcode ? (
        <div className="mt-4">
          <div className="text-sm text-black/60 mb-1">Return Code</div>
          <div className="font-mono text-sm border border-black/10 rounded-md px-3 py-2 bg-black/5">
            {receipt.returnInfo.returnBarcode}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotesCard({ receipt }: { receipt: StoredReceipt }) {
  const notes = receipt.appData?.userNotes?.trim();
  if (!notes) return null;

  return (
    <div className="rounded-[20px] p-6 border bg-white border-black/5 shadow-sm">
      <div className="text-lg font-bold mb-3">Notes</div>
      <div className="text-base text-black/80 leading-relaxed">{notes}</div>
    </div>
  );
}

function ReceiptHero({ receipt }: { receipt: StoredReceipt }) {
  const receiptTitle = receipt.name?.trim() || receipt.merchant.name?.trim();
  const merchantName = receipt.merchant.name?.trim();
  const address = formatMerchantAddress(receipt.merchant.address);
  const merchantLogo = receipt.merchant.logo;
  const showMerchantName =
    Boolean(receiptTitle) &&
    Boolean(merchantName) &&
    receiptTitle !== merchantName;

  return (
    <div className="px-6 py-6">
      <MerchantLogo
        logo={merchantLogo || ""}
        alt={merchantName || "Merchant logo"}
      />
      <div className="text-left">
        <div className="text-2xl font-bold">{receiptTitle}</div>
        {showMerchantName ? (
          <div className="text-sm text-black/50 mt-1">{merchantName}</div>
        ) : null}
        {address ? (
          <div className="text-sm text-black/50 mt-2 flex items-center gap-2">
            <span>📍</span>
            <span>{address}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetadataGrid({ receipt }: { receipt: StoredReceipt }) {
  const dateValue = receipt.transaction.datetime || receipt.createdAt;
  const date = formatReceiptDate(dateValue);
  const time = formatReceiptTime(dateValue);
  const category = receipt.merchant.category?.[0] || "Shopping";
  const total = receipt.totals.total || 0;
  const currency = receipt.totals.currency || "USD";
  const categoryEmoji = getCategoryEmoji(category);

  return (
    <div className="px-6 pt-5 pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold text-black/50 mb-1">Date</div>
          <div className="text-base font-semibold">{date}</div>
          {time ? (
            <div className="text-sm text-black/50 mt-1">{time}</div>
          ) : null}
        </div>
        <div>
          <div className="text-sm font-semibold text-black/50 mb-1">
            Category
          </div>
          <div className="text-base font-semibold flex items-center gap-2">
            <span>{categoryEmoji}</span>
            <span>{category}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-black/50 mb-1">
            Total Amount
          </div>
          <div className="text-base font-semibold">
            {formatCurrency(total, currency)}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-black/50 mb-1">
            Currency
          </div>
          <div className="text-base font-semibold">{currency}</div>
        </div>
      </div>
    </div>
  );
}

export default async function ReceiptSharePage({ params }: PageProps) {
  let receipt: StoredReceipt;
  const { id } = await params;

  try {
    receipt = await fetchPublicReceipt(id);
  } catch (error) {
    if (error instanceof PublicReceiptNotFoundError) {
      notFound();
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Unable to load receipt</div>
          <div className="text-sm text-black/60">
            This receipt link may be invalid or expired.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f8] text-black">
      <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
        <div className="rounded-[20px] overflow-hidden border bg-white border-black/5 shadow-sm">
          <ReceiptHero receipt={receipt} />
          <div className="h-px mx-6 bg-black/10" />
          <MetadataGrid receipt={receipt} />
        </div>

        <SplitSummary receipt={receipt} />

        <div className="rounded-[20px] p-6 border bg-white border-black/5 shadow-sm">
          <ItemsCard receipt={receipt} />
          <TotalsCard receipt={receipt} />
        </div>

        <ReturnInfoCard receipt={receipt} />

        <NotesCard receipt={receipt} />
      </div>
    </main>
  );
}
