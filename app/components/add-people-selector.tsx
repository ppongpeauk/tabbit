/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Common component for selecting people with SectionList, supports React Hook Form
 */

import { useMemo, useCallback } from "react";
import { View, StyleSheet, TextInput, SectionList } from "react-native";
import { useFormContext, Controller, Control } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { CheckboxButton } from "@/components/ui/checkbox-button";
import { useFriends } from "@/hooks/use-friends";

export interface PersonItem {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  type: "person";
}

export interface AddPeopleSelectorProps {
  name: string; // React Hook Form field name
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  control?: Control;
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

  const { data: storedFriends = [], isLoading: loading } = useFriends();

  const peopleItems = useMemo<PersonItem[]>(
    () =>
      storedFriends.map((friend) => ({
        id: friend.id,
        name: friend.name,
        phoneNumber: friend.phoneNumber,
        email: friend.email,
        type: "person",
      })),
    [storedFriends]
  );

  const sections = useMemo(() => {
    return [
      {
        title: "People",
        data: peopleItems,
      },
    ].filter((section) => section.data.length > 0);
  }, [peopleItems]);

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
            item.name.toLowerCase().includes(query)
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

  if (filteredSections.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText size="sm" style={{ opacity: 0.7 }}>
          {searchQuery ? "No people found" : "No people yet"}
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
