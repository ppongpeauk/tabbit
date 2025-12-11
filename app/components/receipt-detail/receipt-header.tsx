import { View, Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import { ContextMenu, Host } from "@expo/ui/swift-ui";
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
        <ThemedText size="xs" family="sans" lineHeight={14}>
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
    // headerRight: () => (
    //   <Host>
    //     <ContextMenu>
    //       <ContextMenu.Items>
    //         <Pressable
    //           onPress={onEdit}
    //           style={({ pressed }) => [
    //             styles.contextMenuItem,
    //             pressed && styles.contextMenuItemPressed,
    //           ]}
    //         >
    //           <SymbolView
    //             name="pencil"
    //             tintColor={
    //               colorScheme === "dark" ? Colors.dark.text : Colors.light.text
    //             }
    //             size={20}
    //           />
    //           <Text
    //             style={[
    //               styles.contextMenuText,
    //               {
    //                 color:
    //                   colorScheme === "dark"
    //                     ? Colors.dark.text
    //                     : Colors.light.text,
    //               },
    //             ]}
    //           >
    //             Edit Receipt
    //           </Text>
    //         </Pressable>
    //         <Pressable
    //           onPress={onShare}
    //           style={({ pressed }) => [
    //             styles.contextMenuItem,
    //             pressed && styles.contextMenuItemPressed,
    //           ]}
    //         >
    //           <SymbolView
    //             name="square.and.arrow.up"
    //             tintColor={
    //               colorScheme === "dark" ? Colors.dark.text : Colors.light.text
    //             }
    //             size={20}
    //           />
    //           <Text
    //             style={[
    //               styles.contextMenuText,
    //               {
    //                 color:
    //                   colorScheme === "dark"
    //                     ? Colors.dark.text
    //                     : Colors.light.text,
    //               },
    //             ]}
    //           >
    //             Share Receipt
    //           </Text>
    //         </Pressable>
    //         <Pressable
    //           onPress={onSplit}
    //           style={({ pressed }) => [
    //             styles.contextMenuItem,
    //             pressed && styles.contextMenuItemPressed,
    //           ]}
    //         >
    //           <SymbolView
    //             name="person.2"
    //             tintColor={
    //               colorScheme === "dark" ? Colors.dark.text : Colors.light.text
    //             }
    //             size={20}
    //           />
    //           <Text
    //             style={[
    //               styles.contextMenuText,
    //               {
    //                 color:
    //                   colorScheme === "dark"
    //                     ? Colors.dark.text
    //                     : Colors.light.text,
    //               },
    //             ]}
    //           >
    //             Split
    //           </Text>
    //         </Pressable>
    //         {hasReturnBarcode && onShowBarcode ? (
    //           <Pressable
    //             onPress={onShowBarcode}
    //             style={({ pressed }) => [
    //               styles.contextMenuItem,
    //               pressed && styles.contextMenuItemPressed,
    //             ]}
    //           >
    //             <SymbolView
    //               name="qrcode"
    //               tintColor={
    //                 colorScheme === "dark"
    //                   ? Colors.dark.text
    //                   : Colors.light.text
    //               }
    //               size={20}
    //             />
    //             <Text
    //               style={[
    //                 styles.contextMenuText,
    //                 {
    //                   color:
    //                     colorScheme === "dark"
    //                       ? Colors.dark.text
    //                       : Colors.light.text,
    //                 },
    //               ]}
    //             >
    //               Show Return Barcode
    //             </Text>
    //           </Pressable>
    //         ) : (
    //           <Pressable
    //             onPress={onScanBarcode}
    //             style={({ pressed }) => [
    //               styles.contextMenuItem,
    //               pressed && styles.contextMenuItemPressed,
    //             ]}
    //           >
    //             <SymbolView
    //               name="qrcode.viewfinder"
    //               tintColor={
    //                 colorScheme === "dark"
    //                   ? Colors.dark.text
    //                   : Colors.light.text
    //               }
    //               size={20}
    //             />
    //             <Text
    //               style={[
    //                 styles.contextMenuText,
    //                 {
    //                   color:
    //                     colorScheme === "dark"
    //                       ? Colors.dark.text
    //                       : Colors.light.text,
    //                 },
    //               ]}
    //             >
    //               Scan Return Barcode
    //             </Text>
    //           </Pressable>
    //         )}
    //         <Pressable
    //           onPress={onDelete}
    //           style={({ pressed }) => [
    //             styles.contextMenuItem,
    //             styles.contextMenuItemDestructive,
    //             pressed && styles.contextMenuItemPressed,
    //           ]}
    //         >
    //           <SymbolView name="trash" tintColor="#FF3B30" size={20} />
    //           <Text
    //             style={[
    //               styles.contextMenuText,
    //               styles.contextMenuTextDestructive,
    //             ]}
    //           >
    //             Delete Receipt
    //           </Text>
    //         </Pressable>
    //       </ContextMenu.Items>
    //       <ContextMenu.Trigger>
    //         <Pressable hitSlop={8} style={styles.headerButton}>
    //           <SymbolView
    //             name="ellipsis"
    //             tintColor={
    //               colorScheme === "dark" ? Colors.dark.text : Colors.light.text
    //             }
    //           />
    //         </Pressable>
    //       </ContextMenu.Trigger>
    //     </ContextMenu>
    //   </Host>
    // ),
  };
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  contextMenuItemPressed: {
    opacity: 0.7,
  },
  contextMenuItemDestructive: {
    // Destructive items can have special styling if needed
  },
  contextMenuText: {
    fontSize: 16,
    fontFamily: "System",
  },
  contextMenuTextDestructive: {
    color: "#FF3B30",
  },
});
