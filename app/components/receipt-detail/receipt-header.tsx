/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Receipt detail header with context menu actions
 */

import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import type { StoredReceipt } from "@/utils/storage";
import { isCollaborator } from "@/utils/storage";
import type { StackNavigationOptions } from "@react-navigation/stack";
import ContextMenu from "react-native-context-menu-view";
import { Colors } from "@/constants/theme";
import { HeaderButton } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { View } from "react-native";

interface ReceiptHeaderProps {
  receipt: StoredReceipt | null;
  colorScheme: "light" | "dark";
  hasPhoto: boolean;
  currentUserId?: string | null;
  onViewPhoto: () => void;
  onEdit: () => void;
  onShare: () => void;
  onSplit: () => void;
  onScanBarcode: () => void;
  onShowBarcode?: () => void;
  onDelete: () => void;
  onSetVisibility: (visibility: "public" | "private") => void;
}

export function ReceiptHeader({
  receipt,
  colorScheme,
  hasPhoto,
  currentUserId,
  onViewPhoto,
  onEdit,
  onShare,
  onSplit,
  onScanBarcode,
  onShowBarcode,
  onDelete,
  onSetVisibility,
}: ReceiptHeaderProps): Partial<StackNavigationOptions> {
  const visibility = receipt?.visibility || "private";
  const isCollaboratorValue = isCollaborator(receipt, currentUserId);

  const menuActions = [
    ...(hasPhoto
      ? [
        {
          title: "View Photo",
          systemIcon: "photo",
          handler: onViewPhoto,
        },
      ]
      : []),
    ...(isCollaboratorValue
      ? [
        {
          title: "Edit",
          systemIcon: "square.and.pencil",
          handler: onEdit,
        },
      ]
      : []),
    {
      title: "Split",
      systemIcon: "person.2",
      handler: onSplit,
    },
    ...(isCollaboratorValue
      ? [
        {
          title: "Share",
          systemIcon: "square.and.arrow.up",
          handler: onShare,
        },
        {
          title: "Set Visibility",
          systemIcon: visibility === "public" ? "globe" : "lock.fill",
          actions: [
            {
              title: "Public",
              subtitle: "Accessible to everyone via a link.",
              systemIcon: "globe",
              selected: visibility === "public",
              handler: () => onSetVisibility("public"),
            },
            {
              title: "Private",
              subtitle: "Accessible only to you and those you share with.",
              systemIcon: "lock.fill",
              selected: visibility === "private",
              handler: () => onSetVisibility("private"),
            },
          ],
        },
        {
          title: "Delete Receipt",
          systemIcon: "trash",
          destructive: true,
          handler: onDelete,
        },
      ]
      : []),
  ]

  const handleMenuPress = (event: {
    nativeEvent: { index: number; name: string; indexPath?: number[] };
  }) => {
    const { index, indexPath } = event.nativeEvent;

    // Handle nested menu items (visibility submenu)
    if (indexPath && indexPath.length > 1) {
      const parentIndex = indexPath[0];
      const childIndex = indexPath[1];
      const parentAction = menuActions[parentIndex];

      if (parentAction?.actions && parentAction.actions[childIndex]) {
        const childAction = parentAction.actions[childIndex];
        if (childAction.handler) {
          console.log("childAction.handler", childAction.handler);
          childAction.handler();
        }
        return;
      }
    }

    // Handle top-level menu items
    const action = menuActions[index];
    if (action?.handler) {
      console.log("action.handler", action.handler);
      action.handler();
    }
  };

  // Remove handler from actions before passing to ContextMenu
  const contextMenuActions = menuActions.map((action) => {
    const { handler, ...rest } = action;
    if (action.actions) {
      return {
        ...rest,
        actions: action.actions.map((child) => {
          const { handler: childHandler, ...childRest } = child;
          return childRest;
        }),
      };
    }
    return rest;
  });

  const isDark = colorScheme === "dark";
  const privacyIcon = visibility === "public" ? "globe" : "lock.fill";
  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;

  const titleText =
    receipt?.name || receipt?.merchant?.name || "Receipt Details";

  return {
    title: "Receipt Details",
    headerTitle: () => (
      <View className="flex-row items-center gap-1.5">
        <SymbolView
          name={privacyIcon}
          tintColor={iconColor}
          style={{ width: 14, height: 14 }}
        />
        <ThemedText size="base" weight="semibold" family="sans">
          {titleText}
        </ThemedText>
      </View>
    ),
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
