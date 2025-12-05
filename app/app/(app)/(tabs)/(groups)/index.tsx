/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Groups screen with SectionList displaying group items
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  type SectionListRenderItemInfo,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { getGroups, getPresignedUrl, type Group } from "@/utils/api";

interface GroupSection {
  title: string;
  data: Group[];
}

interface GroupWithIconUrl extends Group {
  iconUrl?: string;
}

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [groups, setGroups] = useState<GroupWithIconUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const result = await getGroups();
      if (result.success && result.groups) {
        // Fetch presigned URLs for group icons
        const groupsWithIcons = await Promise.all(
          result.groups.map(async (group) => {
            if (group.iconKey) {
              try {
                const urlResult = await getPresignedUrl(group.iconKey);
                if (urlResult.success && urlResult.url) {
                  return { ...group, iconUrl: urlResult.url };
                }
              } catch (error) {
                console.error(
                  "Failed to get presigned URL for group icon:",
                  error
                );
              }
            }
            return group;
          })
        );
        setGroups(groupsWithIcons);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
  }, [loadGroups]);

  const sections = useMemo<GroupSection[]>(() => {
    if (groups.length === 0) {
      return [];
    }
    return [
      {
        title: "Groups",
        data: groups,
      },
    ];
  }, [groups]);

  const renderGroupItem = ({
    item,
  }: SectionListRenderItemInfo<GroupWithIconUrl, GroupSection>) => {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(app)/(tabs)/(groups)/${item.id}`);
    };

    const memberCount = item.members?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.groupItem]}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View
          style={[
            styles.squircleIcon,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
            },
          ]}
        >
          {item.iconUrl ? (
            <Image
              source={{ uri: item.iconUrl }}
              style={styles.groupIcon}
              resizeMode="cover"
            />
          ) : (
            <ThemedText style={styles.iconText} size="xl">
              👥
            </ThemedText>
          )}
        </View>
        <View style={styles.groupContent}>
          <ThemedText style={styles.groupName} weight="semibold">
            {item.name}
          </ThemedText>
          <ThemedText
            style={[
              styles.memberCount,
              {
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              },
            ]}
          >
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </ThemedText>
        </View>
        <IconSymbol
          name="chevron.right"
          size={16}
          color={isDark ? Colors.dark.icon : Colors.light.icon}
        />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListRenderItemInfo<Group, GroupSection>["section"];
  }) => {
    return (
      <View style={styles.sectionHeader}>
        <ThemedText
          weight="semibold"
          family="sans"
          size="sm"
          style={styles.sectionHeaderText}
        >
          {section.title}
        </ThemedText>
      </View>
    );
  };

  const handleCreateGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(groups)/create");
  };

  const handleJoinGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(groups)/join");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
      </View>
    );
  }

  if (sections.length === 0 || sections[0].data.length === 0) {
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
        <View style={[styles.emptyState, { maxWidth: 320 }]}>
          <ThemedText
            size="xl"
            weight="bold"
            family="sans"
            style={styles.title}
          >
            No Groups Yet
          </ThemedText>
          <ThemedText size="base" family="sans" style={styles.subtitle}>
            Create a new group or join an existing one to get started.
          </ThemedText>
          <View style={styles.buttonContainer}>
            <Button
              variant="primary"
              onPress={handleCreateGroup}
              style={styles.button}
              fullWidth
              leftIcon={
                <SymbolView
                  name="plus.circle.fill"
                  tintColor={isDark ? "#000000" : "#FFFFFF"}
                />
              }
            >
              Create Group
            </Button>
            <Button
              variant="outline"
              onPress={handleJoinGroup}
              style={styles.button}
              fullWidth
              leftIcon={
                <SymbolView
                  name="person.2.fill"
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                />
              }
            >
              Join Group
            </Button>
          </View>
        </View>
      </View>
    );
  }

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
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        sections={sections}
        renderItem={renderGroupItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionHeaderText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    gap: 12,
  },
  squircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  iconText: {},
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
  },
  memberCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  button: {
    width: "100%",
  },
});
