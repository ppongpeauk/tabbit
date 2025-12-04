import { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { formatCurrency } from "@/utils/format";
import { FriendSelector } from "./friend-selector";
import type { Friend } from "@/utils/storage";
import type { ReceiptItem } from "@/utils/api";
import type { ContactInfo } from "@/utils/contacts";

interface ItemAssignmentProps {
  item: ReceiptItem;
  itemIndex: number;
  friends: Friend[];
  deviceContacts?: ContactInfo[];
  selectedFriendIds: string[];
  quantities?: number[];
  onFriendIdsChange: (friendIds: string[]) => void;
  onQuantitiesChange?: (quantities: number[]) => void;
  currency: string;
}

export function ItemAssignment({
  item,
  itemIndex,
  friends,
  deviceContacts = [],
  selectedFriendIds,
  quantities,
  onFriendIdsChange,
  onQuantitiesChange,
  currency,
}: ItemAssignmentProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showDetails, setShowDetails] = useState(false);

  const canSplitQuantities = item.quantity > 1 && onQuantitiesChange;

  const handleToggleFriend = (friendId: string) => {
    const isSelected = selectedFriendIds.includes(friendId);
    if (isSelected) {
      onFriendIdsChange(selectedFriendIds.filter((id) => id !== friendId));
      if (quantities && onQuantitiesChange) {
        const friendIndex = selectedFriendIds.indexOf(friendId);
        const newQuantities = [...quantities];
        newQuantities.splice(friendIndex, 1);
        onQuantitiesChange(newQuantities);
      }
    } else {
      onFriendIdsChange([...selectedFriendIds, friendId]);
      if (quantities && onQuantitiesChange) {
        onQuantitiesChange([...quantities, 1]);
      }
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    if (!quantities || !onQuantitiesChange) return;
    const numValue = parseFloat(value) || 0;
    const newQuantities = [...quantities];
    newQuantities[index] = Math.max(0, Math.min(numValue, item.quantity));
    onQuantitiesChange(newQuantities);
  };

  const calculateShare = (friendIndex: number): number => {
    if (selectedFriendIds.length === 0) return 0;
    if (!quantities || quantities.length !== selectedFriendIds.length) {
      return item.totalPrice / selectedFriendIds.length;
    }
    const totalQuantity = quantities.reduce((sum, qty) => sum + qty, 0);
    if (totalQuantity === 0) return 0;
    const quantity = quantities[friendIndex] || 0;
    return (item.totalPrice * quantity) / totalQuantity;
  };

  const totalAssignedQuantity = quantities
    ? quantities.reduce((sum, qty) => sum + qty, 0)
    : selectedFriendIds.length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.02)",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
      ]}
    >
      <Pressable
        onPress={() => setShowDetails(!showDetails)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <ThemedText size="base" weight="semibold">
            {item.name}
          </ThemedText>
          <ThemedText
            size="sm"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
              marginTop: 2,
            }}
          >
            {item.quantity} × {formatCurrency(item.unitPrice, currency)} ={" "}
            {formatCurrency(item.totalPrice, currency)}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText size="base" weight="semibold">
            {formatCurrency(item.totalPrice, currency)}
          </ThemedText>
          <SymbolView
            name={showDetails ? "chevron.up" : "chevron.down"}
            tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
          />
        </View>
      </Pressable>

      {showDetails && (
        <View style={styles.details}>
          <ThemedText size="sm" weight="semibold" style={styles.sectionTitle}>
            Assign to friends
          </ThemedText>
          <FriendSelector
            friends={friends}
            deviceContacts={deviceContacts}
            selectedFriendIds={selectedFriendIds}
            onToggleFriend={handleToggleFriend}
          />

          {selectedFriendIds.length > 0 && (
            <View style={styles.assignments}>
              <ThemedText
                size="sm"
                weight="semibold"
                style={styles.sectionTitle}
              >
                Split breakdown
              </ThemedText>
              {selectedFriendIds.map((friendId, index) => {
                // Check if it's a friend or contact
                const friend = friends.find((f) => f.id === friendId);
                const contact = friendId.startsWith("contact:")
                  ? deviceContacts.find(
                      (c) =>
                        `contact:${c.name}:${
                          c.phoneNumber || c.email || ""
                        }` === friendId
                    )
                  : undefined;
                const personName = friend?.name || contact?.name || "Unknown";
                const quantity = quantities?.[index] || 1;
                const share = calculateShare(index);

                return (
                  <View
                    key={friendId}
                    style={[
                      styles.assignmentRow,
                      {
                        borderBottomColor: isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                      },
                    ]}
                  >
                    <View style={styles.assignmentLeft}>
                      <ThemedText size="sm" weight="semibold">
                        {personName}
                      </ThemedText>
                      {canSplitQuantities && (
                        <View style={styles.quantityInput}>
                          <TextInput
                            style={[
                              styles.quantityInputField,
                              {
                                backgroundColor: isDark
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(0, 0, 0, 0.02)",
                                borderColor: isDark
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(0, 0, 0, 0.1)",
                                color: isDark
                                  ? Colors.dark.text
                                  : Colors.light.text,
                              },
                            ]}
                            value={quantity.toString()}
                            onChangeText={(value) =>
                              handleQuantityChange(index, value)
                            }
                            keyboardType="numeric"
                            placeholder="0"
                          />
                          <ThemedText
                            size="xs"
                            style={{
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            }}
                          >
                            / {item.quantity}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText size="sm" weight="semibold">
                      {formatCurrency(share, currency)}
                    </ThemedText>
                  </View>
                );
              })}
              {canSplitQuantities &&
                totalAssignedQuantity !== item.quantity && (
                  <ThemedText
                    size="xs"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    {totalAssignedQuantity < item.quantity
                      ? `${item.quantity - totalAssignedQuantity} unassigned`
                      : `Over by ${totalAssignedQuantity - item.quantity}`}
                  </ThemedText>
                )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  assignments: {
    gap: 8,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assignmentLeft: {
    flex: 1,
    gap: 4,
  },
  quantityInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  quantityInputField: {
    width: 60,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: Fonts.sans,
    borderWidth: 1,
    textAlign: "center",
  },
});
