import { View } from "react-native";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { ContextMenu, Host, Button } from "@expo/ui/swift-ui";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { formatCurrency, formatDate } from "@/utils/format";
import type { StoredReceipt } from "@/utils/storage";

interface ReceiptHeaderProps {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark";
  onEdit: () => void;
  onShare: () => void;
  onSplit: () => void;
  onScanBarcode: () => void;
  onShowBarcode?: () => void;
  onDelete: () => void;
}

export function ReceiptHeader({
  receipt,
  colorScheme,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
}: ReceiptHeaderProps) {
  const hasReturnBarcode = Boolean(
    receipt?.returnInfo?.returnBarcode &&
      receipt.returnInfo.returnBarcode.trim().length > 0
  );
  return {
    title: receipt?.name || receipt?.merchant.name || "Receipt Details",
    headerTitle: () => (
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <ThemedText size="base" weight="bold" family="sans">
          {receipt?.name || receipt?.merchant.name || "Receipt Details"}
        </ThemedText>
        <ThemedText size="xs" family="sans">
          {receipt?.items.length || 0} Items{" • "}
          {formatDate(receipt?.transaction.datetime || "", false)}
          {" • "}
          {formatCurrency(
            receipt?.totals.total || 0,
            receipt?.totals.currency || "USD"
          )}{" "}
          {receipt?.totals.currency || "USD"}
        </ThemedText>
      </View>
    ),
    headerRight: () => (
      <Host>
        <ContextMenu>
          <ContextMenu.Items>
            <Button systemImage="pencil" onPress={onEdit}>
              Edit Receipt
            </Button>
            <Button systemImage="square.and.arrow.up" onPress={onShare}>
              Share Receipt
            </Button>
            <Button systemImage="person.2" onPress={onSplit}>
              Split
            </Button>
            {hasReturnBarcode && onShowBarcode ? (
              <Button systemImage="qrcode" onPress={onShowBarcode}>
                Show Return Barcode
              </Button>
            ) : (
              <Button systemImage="qrcode.viewfinder" onPress={onScanBarcode}>
                Scan Return Barcode
              </Button>
            )}
            <Button systemImage="trash" onPress={onDelete} role="destructive">
              Delete Receipt
            </Button>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <HeaderButton
              style={{
                alignContent: "center",
                justifyContent: "center",
              }}
            >
              <SymbolView
                name="ellipsis"
                tintColor={
                  colorScheme === "dark" ? Colors.dark.text : Colors.light.text
                }
              />
            </HeaderButton>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    ),
  };
}
