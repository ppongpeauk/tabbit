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
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { View } from "react-native";

interface ReceiptHeaderProps {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark";
  onViewPhoto: () => void;
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
  onViewPhoto,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
}: ReceiptHeaderProps): Partial<StackNavigationOptions> {
  const menuActions = [
    {
      title: "View Photo",
      systemIcon: "photo",
      handler: onViewPhoto,
    },
    {
      title: "Edit",
      systemIcon: "square.and.pencil",
      handler: onEdit,
    },
    {
      title: "Share",
      systemIcon: "square.and.arrow.up",
      handler: onShare,
    },
    {
      title: "Split",
      systemIcon: "person.2",
      handler: onSplit,
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
  const visibility = receipt?.visibility || "private";
  const privacyIcon = visibility === "public" ? "globe" : "lock.fill";
  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;

  return {
    title: "Receipt Details",
    headerTitle: () => {
      if (
        receipt?.name &&
        receipt?.name.trim() !== receipt?.merchant?.name?.trim()
      ) {
        return (
          <View className="flex-col items-center">
            <View className="flex-row items-center gap-1.5">
              <SymbolView
                name={privacyIcon}
                tintColor={iconColor}
                style={{ width: 12, height: 12 }}
              />
              <ThemedText size="xs" weight="semibold" family="sans">
                {receipt?.name}
              </ThemedText>
            </View>
            <ThemedText size="xs" family="sans">
              {receipt?.merchant?.name}
            </ThemedText>
          </View>
        );
      } else if (receipt?.merchant?.name) {
        return (
          <View className="flex-row items-center gap-1.5">
            <SymbolView
              name={privacyIcon}
              tintColor={iconColor}
              style={{ width: 14, height: 14 }}
            />
            <ThemedText size="base" weight="semibold" family="sans">
              {receipt?.merchant?.name}
            </ThemedText>
          </View>
        );
      } else {
        return (
          <View className="flex-row items-center gap-1.5">
            <SymbolView
              name={privacyIcon}
              tintColor={iconColor}
              style={{ width: 14, height: 14 }}
            />
            <ThemedText size="base" weight="semibold" family="sans">
              Receipt Details
            </ThemedText>
          </View>
        );
      }
    },
    headerTitleAlign: "center" as const,
    headerRight: () => (
      <ContextMenu
        actions={contextMenuActions}
        onPress={handleMenuPress}
        dropdownMenuMode={true}
      >
        <HeaderButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <SymbolView name="ellipsis" />
        </HeaderButton>
      </ContextMenu>
    ),
  };
}
