/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt component with monospace formatting
 */

import { View, StyleSheet, Text } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Fonts } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";
import type { Receipt } from "@/utils/api";

interface ReceiptProps {
  data: Receipt;
}

export function Receipt({ data }: ReceiptProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Format date for receipt (more compact)
  const receiptDate = new Date(data.transaction.datetime);
  const dateStr = receiptDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = receiptDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const currency = data.totals.currency;
  const merchantAddress = data.merchant.address
    ? [
        data.merchant.address.line1,
        data.merchant.address.city,
        data.merchant.address.state,
        data.merchant.address.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const bgColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            width: "100%",
          },
        ]}
      >
        <View style={[styles.content, { paddingTop: 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.merchantName,
                { color: isDark ? "#ECEDEE" : "#11181C" },
              ]}
            >
              {data.merchant.name}
            </Text>
            {merchantAddress && (
              <Text
                style={[
                  styles.address,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                {merchantAddress}
              </Text>
            )}
            {data.merchant.phone && (
              <Text
                style={[
                  styles.address,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                {data.merchant.phone}
              </Text>
            )}
            <Text
              style={[
                styles.address,
                { color: isDark ? "#9BA1A6" : "#687076" },
              ]}
            >
              --------------------
            </Text>
          </View>

          {/* Date and Time */}
          <View style={styles.dateSection}>
            <Text
              style={[
                styles.dateText,
                { color: isDark ? "#9BA1A6" : "#687076" },
              ]}
            >
              {dateStr} {timeStr}
            </Text>
            {data.merchant.receiptNumber && (
              <Text
                style={[
                  styles.receiptId,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                RECEIPT #{data.merchant.receiptNumber}
              </Text>
            )}
            {data.transaction.transactionId && (
              <Text
                style={[
                  styles.receiptId,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                TXN #{data.transaction.transactionId}
              </Text>
            )}
            {data.transaction.registerId && (
              <Text
                style={[
                  styles.receiptId,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                REGISTER {data.transaction.registerId}
              </Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <Text
              style={[
                styles.dividerText,
                { color: isDark ? "#9BA1A6" : "#687076" },
              ]}
            >
              --------------------
            </Text>
          </View>

          {/* Items */}
          <View style={styles.itemsSection}>
            {data.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text
                    style={[
                      styles.itemName,
                      { color: isDark ? "#ECEDEE" : "#11181C" },
                    ]}
                  >
                    {item.name.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.itemDetails,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    {item.quantity} @{" "}
                    {formatCurrency(item.unitPrice, currency).replace(/\s/g, "")}
                    {item.category ? ` (${item.category})` : null}
                    {item.sku ? ` SKU: ${item.sku}` : null}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.itemPrice,
                    { color: isDark ? "#ECEDEE" : "#11181C" },
                  ]}
                >
                  {formatCurrency(item.totalPrice, currency).replace(/\s/g, "")}
                </Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <Text
              style={[
                styles.dividerText,
                { color: isDark ? "#9BA1A6" : "#687076" },
              ]}
            >
              --------------------
            </Text>
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text
                style={[
                  styles.totalLabel,
                  { color: isDark ? "#9BA1A6" : "#687076" },
                ]}
              >
                SUBTOTAL
              </Text>
              <Text
                style={[
                  styles.totalValue,
                  { color: isDark ? "#ECEDEE" : "#11181C" },
                ]}
              >
                {formatCurrency(data.totals.subtotal, currency).replace(
                  /\s/g,
                  ""
                )}
              </Text>
            </View>
            {data.totals.taxBreakdown && data.totals.taxBreakdown.length > 0 ? (
              data.totals.taxBreakdown.map((taxItem, index) => (
                <View key={index} style={styles.totalRow}>
                  <Text
                    style={[
                      styles.totalLabel,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    {taxItem.label.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.totalValue,
                      { color: isDark ? "#ECEDEE" : "#11181C" },
                    ]}
                  >
                    {formatCurrency(taxItem.amount, currency).replace(/\s/g, "")}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.totalRow}>
                <Text
                  style={[
                    styles.totalLabel,
                    { color: isDark ? "#9BA1A6" : "#687076" },
                  ]}
                >
                  TAX
                </Text>
                <Text
                  style={[
                    styles.totalValue,
                    { color: isDark ? "#ECEDEE" : "#11181C" },
                  ]}
                >
                  {formatCurrency(data.totals.tax, currency).replace(/\s/g, "")}
                </Text>
              </View>
            )}
            <View style={styles.totalRowFinal}>
              <Text
                style={[
                  styles.totalLabelFinal,
                  { color: isDark ? "#ECEDEE" : "#11181C" },
                ]}
              >
                TOTAL
              </Text>
              <Text
                style={[
                  styles.totalValueFinal,
                  { color: isDark ? "#ECEDEE" : "#11181C" },
                ]}
              >
                {formatCurrency(data.totals.total, currency).replace(/\s/g, "")}
              </Text>
            </View>
            {data.totals.amountPaid !== undefined && (
              <View style={styles.totalRow}>
                <Text
                  style={[
                    styles.totalLabel,
                    { color: isDark ? "#9BA1A6" : "#687076" },
                  ]}
                >
                  AMOUNT PAID
                </Text>
                <Text
                  style={[
                    styles.totalValue,
                    { color: isDark ? "#ECEDEE" : "#11181C" },
                  ]}
                >
                  {formatCurrency(data.totals.amountPaid, currency).replace(
                    /\s/g,
                    ""
                  )}
                </Text>
              </View>
            )}
            {data.totals.changeDue !== undefined &&
              data.totals.changeDue > 0 && (
                <View style={styles.totalRow}>
                  <Text
                    style={[
                      styles.totalLabel,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    CHANGE
                  </Text>
                  <Text
                    style={[
                      styles.totalValue,
                      { color: isDark ? "#ECEDEE" : "#11181C" },
                    ]}
                  >
                    {formatCurrency(data.totals.changeDue, currency).replace(
                      /\s/g,
                      ""
                    )}
                  </Text>
                </View>
              )}
          </View>

          {/* Payment Method */}
          {data.transaction.paymentMethod && (
            <>
              <View style={styles.divider}>
                <Text
                  style={[
                    styles.dividerText,
                    { color: isDark ? "#9BA1A6" : "#687076" },
                  ]}
                >
                  --------------------
                </Text>
              </View>
              <View style={styles.paymentSection}>
                <Text
                  style={[
                    styles.paymentText,
                    { color: isDark ? "#9BA1A6" : "#687076" },
                  ]}
                >
                  PAYMENT: {data.transaction.paymentMethod.toUpperCase()}
                </Text>
                {data.transaction.paymentDetails && (
                  <>
                    {data.transaction.paymentDetails.network && (
                      <Text
                        style={[
                          styles.paymentText,
                          { color: isDark ? "#9BA1A6" : "#687076" },
                        ]}
                      >
                        NETWORK: {data.transaction.paymentDetails.network}
                      </Text>
                    )}
                    {data.transaction.paymentDetails.cardType && (
                      <Text
                        style={[
                          styles.paymentText,
                          { color: isDark ? "#9BA1A6" : "#687076" },
                        ]}
                      >
                        TYPE: {data.transaction.paymentDetails.cardType}
                      </Text>
                    )}
                    {data.transaction.paymentDetails.authCode && (
                      <Text
                        style={[
                          styles.paymentText,
                          { color: isDark ? "#9BA1A6" : "#687076" },
                        ]}
                      >
                        AUTH: {data.transaction.paymentDetails.authCode}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </>
          )}

          {/* Return Info */}
          {data.returnInfo && (
            <>
              <View style={styles.divider}>
                <Text
                  style={[
                    styles.dividerText,
                    { color: isDark ? "#9BA1A6" : "#687076" },
                  ]}
                >
                  --------------------
                </Text>
              </View>
              <View style={styles.returnSection}>
                {data.returnInfo.returnPolicyText && (
                  <Text
                    style={[
                      styles.returnText,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    {data.returnInfo.returnPolicyText}
                  </Text>
                )}
                {data.returnInfo.returnByDate && (
                  <Text
                    style={[
                      styles.returnText,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    RETURN BY: {data.returnInfo.returnByDate}
                  </Text>
                )}
                {data.returnInfo.returnBarcode && (
                  <Text
                    style={[
                      styles.returnText,
                      { color: isDark ? "#9BA1A6" : "#687076" },
                    ]}
                  >
                    RETURN CODE: {data.returnInfo.returnBarcode}
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                { color: isDark ? "#9BA1A6" : "#687076" },
              ]}
            >
              THANK YOU FOR YOUR BUSINESS!
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  container: {
    overflow: "hidden",
    borderRadius: 8,
    paddingVertical: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  merchantName: {
    fontSize: 24,
    fontFamily: Fonts.mono,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  address: {
    fontSize: 17,
    fontFamily: Fonts.mono,
    textAlign: "center",
  },
  dateSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 17,
    fontFamily: Fonts.mono,
    marginBottom: 2,
  },
  receiptId: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  divider: {
    alignItems: "center",
    marginVertical: 8,
  },
  dividerText: {
    fontSize: 17,
    fontFamily: Fonts.mono,
  },
  itemsSection: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemLeft: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 18,
    fontFamily: Fonts.mono,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: Fonts.mono,
    fontWeight: "600",
  },
  totalsSection: {
    marginTop: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.2)",
  },
  totalLabel: {
    fontSize: 17,
    fontFamily: Fonts.mono,
  },
  totalValue: {
    fontSize: 17,
    fontFamily: Fonts.mono,
  },
  totalLabelFinal: {
    fontSize: 20,
    fontFamily: Fonts.mono,
    fontWeight: "700",
  },
  totalValueFinal: {
    fontSize: 20,
    fontFamily: Fonts.mono,
    fontWeight: "700",
  },
  paymentSection: {
    alignItems: "center",
    marginTop: 8,
  },
  paymentText: {
    fontSize: 16,
    fontFamily: Fonts.mono,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
  },
  footerText: {
    fontSize: 16,
    fontFamily: Fonts.mono,
    fontWeight: "600",
  },
  returnSection: {
    alignItems: "center",
    marginTop: 8,
  },
  returnText: {
    fontSize: 14,
    fontFamily: Fonts.mono,
    textAlign: "center",
    marginBottom: 4,
  },
});
