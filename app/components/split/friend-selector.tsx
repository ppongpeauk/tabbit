import { View, StyleSheet, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { CheckboxButton } from "@/components/ui/checkbox-button";
import type { Friend } from "@/utils/storage";
import type { ContactInfo } from "@/utils/contacts";

interface FriendSelectorProps {
  friends: Friend[];
  deviceContacts?: ContactInfo[];
  selectedFriendIds: string[];
  onToggleFriend: (friendId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Generate a consistent ID for a contact
function getContactId(contact: ContactInfo): string {
  return `contact:${contact.name}:${
    contact.phoneNumber || contact.email || ""
  }`;
}

export function FriendSelector({
  friends,
  deviceContacts = [],
  selectedFriendIds,
  onToggleFriend,
  searchQuery = "",
  onSearchChange,
}: FriendSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = deviceContacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults = filteredFriends.length > 0 || filteredContacts.length > 0;

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
                My Friends
              </ThemedText>
              {filteredFriends.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <CheckboxButton
                    key={friend.id}
                    id={friend.id}
                    label={friend.name}
                    subtitle={friend.phoneNumber || friend.email}
                    isSelected={isSelected}
                    onPress={() => onToggleFriend(friend.id)}
                  />
                );
              })}
            </View>
          )}
          {filteredContacts.length > 0 && (
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
                Contacts
              </ThemedText>
              {filteredContacts.map((contact) => {
                const contactId = getContactId(contact);
                const isSelected = selectedFriendIds.includes(contactId);
                return (
                  <CheckboxButton
                    key={contactId}
                    id={contactId}
                    label={contact.name}
                    subtitle={contact.phoneNumber || contact.email}
                    imageUri={contact.imageUri}
                    isSelected={isSelected}
                    onPress={() => onToggleFriend(contactId)}
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
