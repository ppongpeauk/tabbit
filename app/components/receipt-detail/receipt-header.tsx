/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail header with context menu actions
 */

import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import type { StoredReceipt } from "@/utils/storage";
import type { StackNavigationOptions } from "@react-navigation/stack";
import ContextMenu from "react-native-context-menu-view";
import { Colors } from "@/constants/theme";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

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
}: ReceiptHeaderProps): Partial<StackNavigationOptions> {
  const hasReturnBarcode = Boolean(
    receipt?.returnInfo?.returnBarcode &&
    receipt.returnInfo.returnBarcode.trim().length > 0
  );

  const menuActions = [
    {
      title: "Edit Receipt",
      systemIcon: "pencil",
      handler: onEdit,
    },
    {
      title: "Share Receipt",
      systemIcon: "square.and.arrow.up",
      handler: onShare,
    },
    {
      title: "Split",
      systemIcon: "person.2",
      handler: onSplit,
    },
    hasReturnBarcode && onShowBarcode
      ? {
          title: "Show Return Barcode",
          systemIcon: "qrcode",
          handler: onShowBarcode,
        }
      : {
          title: "Scan Return Barcode",
          systemIcon: "qrcode.viewfinder",
          handler: onScanBarcode,
        },
    {
      title: "Delete Receipt",
      systemIcon: "trash",
      destructive: true,
      handler: onDelete,
    },
  ].filter(Boolean) as {
    title: string;
    systemIcon: string;
    destructive?: boolean;
    handler: () => void;
  }[];

  const handleMenuPress = (event: {
    nativeEvent: { index: number; name: string };
  }) => {
    const { index } = event.nativeEvent;
    const action = menuActions[index];
    if (action?.handler) {
      action.handler();
    }
  };

  // Remove handler from actions before passing to ContextMenu
  const contextMenuActions = menuActions.map(
    ({ handler, ...action }) => action
  );

  const isDark = colorScheme === "dark";

  return {
    title: "Receipt Details",
    headerTitle: () => (
      <ThemedText size="lg" weight="semibold" family="sans">
        Receipt Details
      </ThemedText>
    ),
    headerTitleAlign: "center" as const,
    headerRight: () => (
      <ContextMenu
        actions={contextMenuActions}
        onPress={handleMenuPress}
        dropdownMenuMode={true}
      >
        <PlatformPressable
          hitSlop={8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView
            name="ellipsis"
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
            style={{ width: 24, height: 24 }}
          />
        </PlatformPressable>
      </ContextMenu>
    ),
  };
}
