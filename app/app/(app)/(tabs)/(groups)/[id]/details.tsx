import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
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
            style={styles.headerButton}
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

  if (!group) {
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
        <ThemedText size="lg" weight="semibold">
          Group not found
        </ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
      >
        {/* Group Header Section */}
        <View style={styles.headerSection}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            ]}
          >
            {iconUrl ? (
              <Image source={{ uri: iconUrl }} style={styles.icon} />
            ) : (
              <ThemedText size="xl">👥</ThemedText>
            )}
          </View>

          <View style={styles.infoSection}>
            <ThemedText size="xl" weight="bold" style={styles.groupName}>
              {group.name}
            </ThemedText>
            {group.description && (
              <ThemedText
                size="base"
                style={[
                  styles.description,
                  {
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  },
                ]}
              >
                {group.description}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  color: isDark ? Colors.dark.text : Colors.light.text,
                },
              ]}
              size="lg"
              weight="semibold"
            >
              Members
            </ThemedText>
            {isAdmin && (
              <TouchableOpacity
                onPress={handleAddMember}
                style={styles.addButton}
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
              style={[
                styles.membersContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 1)",
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? "transparent" : "rgba(0, 0, 0, 0.1)",
                },
              ]}
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
                        style={[
                          styles.memberSeparator,
                          { backgroundColor: separatorColor },
                        ]}
                      />
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.memberItem,
                        {
                          backgroundColor: pressed ? pressedBg : "transparent",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: isDark
                              ? "rgba(255, 255, 255, 0.1)"
                              : "rgba(0, 0, 0, 0.05)",
                          },
                        ]}
                      >
                        <ThemedText size="base" weight="semibold">
                          {initials}
                        </ThemedText>
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <ThemedText
                            style={styles.memberName}
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
                          style={[
                            styles.memberRole,
                            {
                              color: isDark
                                ? Colors.dark.icon
                                : Colors.light.icon,
                            },
                          ]}
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
              style={[
                styles.emptyText,
                {
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                },
              ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  infoSection: {
    width: "100%",
    alignItems: "center",
  },
  groupName: {
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
    opacity: 0.7,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  membersContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  memberSeparator: {
    height: 1,
    marginHorizontal: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 16,
  },
  memberRole: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyText: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  errorText: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
