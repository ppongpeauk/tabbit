/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Friend selection component for split screen
 */

import { View, StyleSheet, Pressable, TextInput, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
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
  return `contact:${contact.name}:${contact.phoneNumber || contact.email || ""}`;
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

  const renderPersonItem = (
    id: string,
    name: string,
    phoneNumber?: string,
    email?: string,
    imageUri?: string
  ) => {
    const isSelected = selectedFriendIds.includes(id);
    return (
      <Pressable
        key={id}
        onPress={() => onToggleFriend(id)}
        style={[
          styles.friendItem,
          {
            backgroundColor: isSelected
              ? isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)"
              : isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.02)",
            borderColor: isSelected
              ? isDark
                ? Colors.dark.tint
                : Colors.light.tint
              : isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <ThemedText
              size="sm"
              weight="semibold"
              style={{
                color: isDark ? Colors.dark.text : Colors.light.text,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <View style={styles.friendInfo}>
          <ThemedText size="base" weight="semibold">
            {name}
          </ThemedText>
          {(phoneNumber || email) && (
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
                marginTop: 2,
              }}
            >
              {phoneNumber || email}
            </ThemedText>
          )}
        </View>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected
                ? isDark
                  ? Colors.dark.tint
                  : Colors.light.tint
                : "transparent",
              borderColor: isSelected
                ? isDark
                  ? Colors.dark.tint
                  : Colors.light.tint
                : isDark
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(0, 0, 0, 0.3)",
            },
          ]}
        >
          {isSelected && (
            <SymbolView
              name="checkmark"
              tintColor="white"
              style={{ width: 12, height: 12 }}
            />
          )}
        </View>
      </Pressable>
    );
  };

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
              {filteredFriends.map((friend) =>
                renderPersonItem(
                  friend.id,
                  friend.name,
                  friend.phoneNumber,
                  friend.email
                )
              )}
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
              {filteredContacts.map((contact) =>
                renderPersonItem(
                  getContactId(contact),
                  contact.name,
                  contact.phoneNumber,
                  contact.email,
                  contact.imageUri
                )
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
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  friendInfo: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
