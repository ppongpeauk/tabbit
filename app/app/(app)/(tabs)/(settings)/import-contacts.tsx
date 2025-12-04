import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { fetchContacts, requestContactsPermission, type ContactInfo } from "@/utils/contacts";
import { saveFriend } from "@/utils/storage";
import * as Haptics from "expo-haptics";

export default function ImportContactsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert(
          "Permission Denied",
          "Contacts permission is required to import contacts. Please enable it in Settings.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      const fetchedContacts = await fetchContacts();
      if (fetchedContacts.length === 0) {
        Alert.alert(
          "No Contacts",
          "No contacts found on your device",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      setContacts(fetchedContacts);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to load contacts",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const toggleContactSelection = useCallback((contactName: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactName)) {
        newSet.delete(contactName);
      } else {
        newSet.add(contactName);
      }
      return newSet;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleImportSelected = useCallback(async () => {
    if (selectedContacts.size === 0) {
      Alert.alert("No Selection", "Please select at least one contact to import");
      return;
    }

    try {
      const contactsToImport = contacts.filter((contact) =>
        selectedContacts.has(contact.name)
      );

      let imported = 0;
      let skipped = 0;

      for (const contact of contactsToImport) {
        try {
          await saveFriend({
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
          });
          imported++;
        } catch (error) {
          // Contact might already exist, skip it
          skipped++;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        `Imported ${imported} contact${imported !== 1 ? "s" : ""}${
          skipped > 0 ? ` (${skipped} skipped)` : ""
        }`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to import contacts");
    }
  }, [contacts, selectedContacts, router]);

  const renderContactItem = useCallback(
    ({ item }: { item: ContactInfo }) => {
      const isSelected = selectedContacts.has(item.name);
      return (
        <Pressable
          onPress={() => toggleContactSelection(item.name)}
          style={[
            styles.contactItem,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderColor: isSelected
                ? isDark
                  ? Colors.dark.tint
                  : Colors.light.tint
                : isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {item.imageUri ? (
            <Image
              source={{ uri: item.imageUri }}
              style={styles.avatar}
            />
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
                size="lg"
                weight="semibold"
                style={[
                  styles.avatarText,
                  {
                    color: isDark ? Colors.dark.text : Colors.light.text,
                  },
                ]}
              >
                {item.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.contactInfo}>
            <ThemedText size="base" weight="semibold">
              {item.name}
            </ThemedText>
            {item.phoneNumber && (
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                  marginTop: 4,
                }}
              >
                {item.phoneNumber}
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
              <ThemedText style={{ color: "white", fontSize: 12 }}>✓</ThemedText>
            )}
          </View>
        </Pressable>
      );
    },
    [isDark, selectedContacts, toggleContactSelection]
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.tint : Colors.light.tint}
        />
        <ThemedText style={{ marginTop: 16 }}>Loading contacts...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText size="sm" style={{ opacity: 0.7 }}>
          {selectedContacts.size} of {contacts.length} selected
        </ThemedText>
        {selectedContacts.size > 0 && (
          <Button variant="ghost" size="sm" onPress={handleImportSelected}>
            Import Selected
          </Button>
        )}
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={renderContactItem}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {},
  contactInfo: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

