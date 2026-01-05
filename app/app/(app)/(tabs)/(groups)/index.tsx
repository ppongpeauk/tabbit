/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Groups screen with SectionList displaying group items
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
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
        className="flex-row items-center my-2 gap-3"
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View
          className="w-12 h-12 rounded-xl items-center justify-center overflow-hidden"
          style={{
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
          }}
        >
          {item.iconUrl ? (
            <Image
              source={{ uri: item.iconUrl }}
              className="w-12 h-12 rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <ThemedText size="xl">
              👥
            </ThemedText>
          )}
        </View>
        <View className="flex-1">
          <ThemedText className="text-base" weight="semibold">
            {item.name}
          </ThemedText>
          <ThemedText
            className="text-sm opacity-70"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            }}
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
      <View className="py-3 pt-5 pb-1">
        <ThemedText
          weight="semibold"
          family="sans"
          size="sm"
          className="uppercase tracking-widest opacity-60"
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
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
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
        className="flex-1"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <View
          className="flex-1 justify-center items-center p-5 self-center"
          style={{ maxWidth: 320 }}
        >
          <ThemedText
            size="xl"
            weight="bold"
            family="sans"
            className="text-center"
          >
            No Groups Yet
          </ThemedText>
          <ThemedText
            size="base"
            family="sans"
            className="opacity-60 text-center mb-4"
          >
            Create a new group or join an existing one to get started.
          </ThemedText>
          <View className="w-full gap-3 items-center">
            <Button
              variant="primary"
              onPress={handleCreateGroup}
              className="flex-1"
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
              className="flex-1"
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
      className="flex-1"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
    >
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        sections={sections}
        renderItem={renderGroupItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5"
        className="flex-1"
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

