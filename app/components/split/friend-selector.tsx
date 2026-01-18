import { useMemo } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { CheckboxButton } from "@/components/ui/checkbox-button";
import type { Friend } from "@/utils/storage";
import { useAuth } from "@/contexts/auth-context";

interface FriendSelectorProps {
  friends: Friend[];
  selectedFriendIds: string[];
  onToggleFriend: (friendId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  tempPeople?: Record<string, string>;
}

export function FriendSelector({
  friends,
  selectedFriendIds,
  onToggleFriend,
  searchQuery = "",
  onSearchChange,
  tempPeople = {},
}: FriendSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const allPeople = useMemo(() => {
    const people: Array<{ id: string; name: string; phoneNumber?: string; email?: string }> = [...friends];

    if (user && selectedFriendIds.includes(user.id)) {
      const userInFriends = friends.some((f) => f.id === user.id);
      if (!userInFriends) {
        people.unshift({
          id: user.id,
          name: user.name || "You",
          email: user.email,
        });
      }
    }

    Object.entries(tempPeople).forEach(([tempId, name]) => {
      if (selectedFriendIds.includes(tempId)) {
        people.push({
          id: tempId,
          name,
        });
      }
    });

    return people;
  }, [friends, user, selectedFriendIds, tempPeople]);

  const filteredFriends = allPeople.filter((person) =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults = filteredFriends.length > 0;

  return (
    <View style={styles.container}>
      {onSearchChange && (
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: isDark ? Colors.dark.text : Colors.light.text,
              },
            ]}
            placeholder="Search people..."
            placeholderTextColor={isDark ? Colors.dark.icon : Colors.light.icon}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
      )}
      {!hasResults ? (
        <View style={styles.emptyState}>
          <ThemedText size="sm" style={{ opacity: 0.7 }}>
            {searchQuery ? "No people found" : "No people available"}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.friendsList}>
          {filteredFriends.length > 0 && (
            <View style={styles.section}>
              <ThemedText
                size="sm"
                weight="semibold"
                style={[
                  styles.sectionHeader,
                  {
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  },
                ]}
              >
                People
              </ThemedText>
              {filteredFriends.map((person) => {
                const isSelected = selectedFriendIds.includes(person.id);
                return (
                  <CheckboxButton
                    key={person.id}
                    id={person.id}
                    label={person.name}
                    subtitle={person.phoneNumber || person.email}
                    isSelected={isSelected}
                    onPress={() => onToggleFriend(person.id)}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInput: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: 1,
  },
  friendsList: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    marginBottom: 4,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
