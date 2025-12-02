/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Friends screen - shows who owes how much
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FlatList, StyleSheet, View } from "react-native";

interface FriendDebt {
  id: string;
  name: string;
  amount: number;
}

const mockFriends: FriendDebt[] = [
  { id: "1", name: "Alice", amount: 25.5 },
  { id: "2", name: "Bob", amount: 15.0 },
  { id: "3", name: "Charlie", amount: 42.75 },
];

export default function FriendsScreen() {
  const totalOwed = mockFriends.reduce((sum, friend) => sum + friend.amount, 0);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={mockFriends}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ThemedView style={styles.friendItem}>
          <ThemedText type="default" style={styles.friendName}>
            {item.name}
          </ThemedText>
          <ThemedText type="default" style={styles.amount}>
            ${item.amount.toFixed(2)}
          </ThemedText>
        </ThemedView>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  totalText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    flex: 1,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  friendName: {
    fontSize: 18,
  },
  amount: {
    fontSize: 18,
    fontWeight: "600",
  },
});
