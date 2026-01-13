/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Common component for selecting people with SectionList, supports React Hook Form
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, TextInput, SectionList } from "react-native";
import { useFormContext, Controller, Control } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { CheckboxButton } from "@/components/ui/checkbox-button";
import type { ContactInfo } from "@/utils/contacts";
import {
  getRecentContacts,
  getFriendsList,
  fetchContacts,
} from "@/utils/contacts";
import { useFriends } from "@/hooks/use-friends";
import type { Friend } from "@/utils/storage";

export interface PersonItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  imageUri?: string;
  type: "recent" | "friend" | "contact";
  originalId?: string; // For friends, keep the original ID
}

export interface AddPeopleSelectorProps {
  name: string; // React Hook Form field name
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  control?: Control;
}

// Generate a consistent ID for a contact
function getContactId(
  contact: ContactInfo | Friend,
  type: "recent" | "friend" | "contact"
): string {
  if ("id" in contact && type === "friend") {
    return `friend:${contact.id}`;
  }
  return `${type}:${contact.name}:${
    contact.phoneNumber || contact.email || ""
  }`;
}

// Normalize contact/friend to PersonItem
function normalizeToPersonItem(
  item: ContactInfo | Friend,
  type: "recent" | "friend" | "contact"
): PersonItem {
  const id = getContactId(item, type);
  return {
    id,
    name: item.name,
    phoneNumber: item.phoneNumber,
    email: item.email,
    imageUri: "imageUri" in item ? item.imageUri : undefined,
    type,
    originalId: "id" in item ? item.id : undefined,
  };
}

// Check if two PersonItems represent the same person
function isSamePerson(item1: PersonItem, item2: PersonItem): boolean {
  // Check by phone number first
  if (
    item1.phoneNumber &&
    item2.phoneNumber &&
    item1.phoneNumber === item2.phoneNumber
  ) {
    return true;
  }
  // Check by email
  if (item1.email && item2.email && item1.email === item2.email) {
    return true;
  }
  // Check by name and phone/email combination
  if (item1.name === item2.name) {
    if (item1.phoneNumber && item2.phoneNumber) return true;
    if (item1.email && item2.email) return true;
  }
  return false;
}

// Create a unified ID for the same person across sections
function getUnifiedId(item: PersonItem): string {
  // Create a consistent ID based on phone/email/name
  // This ensures the same person gets the same ID regardless of section
  // Prefer phone > email > name for uniqueness
  if (item.phoneNumber) {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = item.phoneNumber.replace(/\D/g, "");
    return `unified:phone:${normalizedPhone}`;
  }
  if (item.email) {
    return `unified:email:${item.email.toLowerCase()}`;
  }
  // Fallback to name (less reliable but better than nothing)
  return `unified:name:${item.name.toLowerCase().trim()}`;
}

export function AddPeopleSelector({
  name,
  searchQuery = "",
  onSearchChange,
  control: externalControl,
}: AddPeopleSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const formContext = useFormContext();
  const control = externalControl || formContext?.control;

  const [recentItems, setRecentItems] = useState<PersonItem[]>([]);
  const [friendItems, setFriendItems] = useState<PersonItem[]>([]);
  const [contactItems, setContactItems] = useState<PersonItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  const { data: storedFriends = [] } = useFriends();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recents, friends, contacts] = await Promise.all([
          getRecentContacts(),
          getFriendsList(),
          fetchContacts().catch(() => [] as ContactInfo[]),
        ]);

        const recentPersons = recents.map((item) =>
          normalizeToPersonItem(item, "recent")
        );
        const friendPersons = friends.map((item) =>
          normalizeToPersonItem(item, "friend")
        );
        const contactPersons = contacts.map((item) =>
          normalizeToPersonItem(item, "contact")
        );
        const storedFriendPersons = storedFriends.map((item) =>
          normalizeToPersonItem(item, "friend")
        );

        // Combine friends from both sources
        const allFriendPersons = [...friendPersons, ...storedFriendPersons];

        setRecentItems(recentPersons);
        setFriendItems(allFriendPersons);
        setContactItems(contactPersons);
      } catch (error) {
        console.error("Error loading people data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storedFriends]);

  // Create unified items with shared IDs across sections
  // Also store the originalId for friends so we can convert back
  const unifiedItemsMap = useMemo(() => {
    const unified = new Map<string, PersonItem>();
    const allItems = [...recentItems, ...friendItems, ...contactItems];

    // Create unified items - same person gets same ID
    // Prioritize friends to keep their originalId
    allItems.forEach((item) => {
      const unifiedId = getUnifiedId(item);
      if (!unified.has(unifiedId)) {
        unified.set(unifiedId, { ...item, id: unifiedId });
      } else {
        // If already exists and current item is a friend with originalId, preserve it
        const existing = unified.get(unifiedId)!;
        if (item.originalId && !existing.originalId) {
          unified.set(unifiedId, { ...existing, originalId: item.originalId });
        }
      }
    });

    return unified;
  }, [recentItems, friendItems, contactItems]);

  // Create sections with unified items
  const sections = useMemo(() => {
    const unifiedItems = Array.from(unifiedItemsMap.values());
    const recents: PersonItem[] = [];
    const friends: PersonItem[] = [];
    const contacts: PersonItem[] = [];

    // Add items to sections based on their original type
    recentItems.forEach((item) => {
      const unifiedId = getUnifiedId(item);
      const unifiedItem = unifiedItemsMap.get(unifiedId);
      if (unifiedItem && !recents.find((r) => r.id === unifiedId)) {
        recents.push(unifiedItem);
      }
    });

    friendItems.forEach((item) => {
      const unifiedId = getUnifiedId(item);
      const unifiedItem = unifiedItemsMap.get(unifiedId);
      if (unifiedItem && !friends.find((f) => f.id === unifiedId)) {
        friends.push(unifiedItem);
      }
    });

    contactItems.forEach((item) => {
      const unifiedId = getUnifiedId(item);
      const unifiedItem = unifiedItemsMap.get(unifiedId);
      // Only add to contacts if not already in recents or friends
      if (
        unifiedItem &&
        !contacts.find((c) => c.id === unifiedId) &&
        !recents.find((r) => r.id === unifiedId) &&
        !friends.find((f) => f.id === unifiedId)
      ) {
        contacts.push(unifiedItem);
      }
    });

    return [
      {
        title: "Recents",
        data: recents,
      },
      {
        title: "Friends",
        data: friends,
      },
      {
        title: "Contacts",
        data: contacts,
      },
    ].filter((section) => section.data.length > 0);
  }, [recentItems, friendItems, contactItems, unifiedItemsMap]);

  // Filter items by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return sections;
    }

    const query = searchQuery.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.phoneNumber?.toLowerCase().includes(query) ||
            item.email?.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [sections, searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: PersonItem }) => {
      if (!control) {
        console.warn(
          "AddPeopleSelector: control is required. Wrap in FormProvider or pass control prop."
        );
        return null;
      }

      return (
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange } }) => {
            const selectedIds = Array.isArray(value) ? value : [];
            const isSelected = selectedIds.includes(item.id);

            const handleToggle = () => {
              if (isSelected) {
                onChange(selectedIds.filter((id: string) => id !== item.id));
              } else {
                onChange([...selectedIds, item.id]);
              }
            };

            return (
              <View style={styles.rowContainer}>
                <CheckboxButton
                  id={item.id}
                  label={item.name}
                  subtitle={item.phoneNumber || item.email}
                  imageUri={item.imageUri}
                  isSelected={isSelected}
                  onPress={handleToggle}
                  noBorder
                />
              </View>
            );
          }}
        />
      );
    },
    [control, name]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: PersonItem[] } }) => {
      if (section.data.length === 0) {
        return null;
      }

      return (
        <View style={styles.sectionHeader}>
          <ThemedText
            size="sm"
            weight="semibold"
            style={[
              styles.sectionHeaderText,
              {
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              },
            ]}
          >
            {section.title}
          </ThemedText>
        </View>
      );
    },
    [isDark]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ThemedText size="sm" style={{ opacity: 0.7 }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

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

      <SectionList
        sections={filteredSections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {},
  searchInput: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  sectionHeader: {
    paddingHorizontal: 0,
  },
  sectionHeaderText: {
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  rowContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 4,
  },
});
