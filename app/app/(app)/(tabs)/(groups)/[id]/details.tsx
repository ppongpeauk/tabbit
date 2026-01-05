import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  useLocalSearchParams,
  router,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { getGroup, getPresignedUrl, type Group } from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";

export default function GroupDetailsScreen() {
  const { id, title, memberCount } = useLocalSearchParams<{
    id: string;
    title?: string;
    memberCount?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const navigation = useNavigation();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getGroup(id);
      if (result.success && result.group) {
        setGroup(result.group);

        if (result.group.iconKey) {
          try {
            const urlResult = await getPresignedUrl(result.group.iconKey);
            if (urlResult.success && urlResult.url) {
              setIconUrl(urlResult.url);
            }
          } catch (error) {
            console.error("Failed to load group icon:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load group:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroup();
  }, [loadGroup]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/(tabs)/(groups)/${id}/edit`);
  }, [id]);

  const handleAddMember = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(groups)/join");
  };

  const isAdmin =
    group && user
      ? group.members.some((m) => m.userId === user.id && m.role === "admin")
      : false;

  useLayoutEffect(() => {
    const displayTitle = group?.name || title || "Group Details";
    const displayMemberCount =
      group?.members?.length ?? (memberCount ? parseInt(memberCount, 10) : 0);
    navigation.setOptions({
      title: displayTitle,
      headerTitle: () => (
        <View style={{ flexDirection: "column", alignItems: "center" }}>
          <ThemedText size="base" weight="bold" family="sans">
            {displayTitle}
          </ThemedText>
          <ThemedText size="xs" family="sans">
            {displayMemberCount}{" "}
            {displayMemberCount === 1 ? "member" : "members"}
          </ThemedText>
        </View>
      ),
      headerRight: () => {
        if (!isAdmin) return null;
        return (
          <Pressable
            onPress={handleEdit}
            hitSlop={8}
            className="p-2 min-w-[44px] min-h-[44px] justify-center items-center"
          >
            <SymbolView
              name="gearshape.fill"
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
            />
          </Pressable>
        );
      },
    });
  }, [navigation, group, title, memberCount, isAdmin, isDark, handleEdit]);

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

  if (!group) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        <ThemedText size="lg" weight="semibold">
          Group not found
        </ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
      behavior="padding"
    >
      <ScrollView
        contentContainerClassName="p-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
      >
        {/* Group Header Section */}
        <View className="items-center mb-8">
          <View
            className="w-[120px] h-[120px] rounded-3xl items-center justify-center mb-4 overflow-hidden"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
            }}
          >
            {iconUrl ? (
              <Image source={{ uri: iconUrl }} className="w-[120px] h-[120px] rounded-3xl" />
            ) : (
              <ThemedText size="xl">👥</ThemedText>
            )}
          </View>

          <View className="w-full items-center">
            <ThemedText size="xl" weight="bold" className="text-center mb-2">
              {group.name}
            </ThemedText>
            {group.description && (
              <ThemedText
                size="base"
                className="text-center opacity-70 mt-1"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {group.description}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Members Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className="flex-1"
              style={{
                color: isDark ? Colors.dark.text : Colors.light.text,
              }}
              size="lg"
              weight="semibold"
            >
              Members
            </ThemedText>
            {isAdmin && (
              <TouchableOpacity
                onPress={handleAddMember}
                className="p-1"
                activeOpacity={0.7}
              >
                <SymbolView
                  name="plus.circle.fill"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  size={24}
                />
              </TouchableOpacity>
            )}
          </View>

          {group.members && group.members.length > 0 ? (
            <View
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 1)",
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? "transparent" : "rgba(0, 0, 0, 0.1)",
              }}
            >
              {group.members.map((member, index) => {
                const isCreator = member.userId === group.creatorId;
                const displayName =
                  member.user.name ||
                  member.user.email.split("@")[0] ||
                  "Unknown";
                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const separatorColor = isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)";
                const pressedBg = isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.03)";

                return (
                  <View key={member.id}>
                    {index > 0 && (
                      <View
                        className="h-[1px] mx-4"
                        style={{ backgroundColor: separatorColor }}
                      />
                    )}
                    <Pressable
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        gap: 12,
                        backgroundColor: pressed ? pressedBg : "transparent",
                      })}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <ThemedText size="base" weight="semibold">
                          {initials}
                        </ThemedText>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <ThemedText
                            className="text-base"
                            weight="semibold"
                          >
                            {displayName}
                          </ThemedText>
                          {isCreator && (
                            <SymbolView
                              name="crown.fill"
                              tintColor="#FFD700"
                              size={16}
                            />
                          )}
                        </View>
                        <ThemedText
                          className="text-sm opacity-70 mt-0.5"
                          style={{
                            color: isDark
                              ? Colors.dark.icon
                              : Colors.light.icon,
                          }}
                          size="sm"
                        >
                          {member.role === "admin" ? "Admin" : "Member"}
                        </ThemedText>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <ThemedText
              className="opacity-60 italic"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
              size="base"
            >
              No members yet
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)

