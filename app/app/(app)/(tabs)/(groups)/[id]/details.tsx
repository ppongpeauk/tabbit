/**
 * @author Composer
 * @description Group details screen with icon, name, edit button, and members list
 */

import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useForm, Controller } from "react-hook-form";
import {
  useLocalSearchParams,
  router,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import {
  getGroup,
  getPresignedUrl,
  updateGroup,
  type Group,
} from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";

interface EditGroupFormData {
  name: string;
  description: string;
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditGroupFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const loadGroup = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getGroup(id);
      if (result.success && result.group) {
        setGroup(result.group);
        reset({
          name: result.group.name,
          description: result.group.description || "",
        });

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
  }, [id, reset]);

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

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (group) {
      reset({
        name: group.name,
        description: group.description || "",
      });
    }
    setIsEditing(false);
  };

  const onSubmit = async (data: EditGroupFormData) => {
    if (!group || !id) return;

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await updateGroup(id, {
        name: data.name,
        description: data.description || undefined,
      });

      if (!result.success) {
        throw new Error(result.message || "Failed to update group");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      await loadGroup();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to update group. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
    });
  }, [navigation, group, title, memberCount]);

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

          {isEditing ? (
            <View style={styles.editForm}>
              <Controller
                control={control}
                rules={{
                  required: "Group name is required",
                  minLength: {
                    value: 1,
                    message: "Group name must be at least 1 character",
                  },
                  maxLength: {
                    value: 50,
                    message: "Group name must be less than 50 characters",
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormTextInput
                    label="Group Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter group name"
                    autoFocus
                    leftIcon={<SymbolView name="person.2.fill" />}
                  />
                )}
                name="name"
              />
              {errors.name && (
                <ThemedText
                  style={[styles.errorText, { color: "#FF3B30" }]}
                  size="sm"
                >
                  {errors.name.message}
                </ThemedText>
              )}

              <Controller
                control={control}
                rules={{
                  maxLength: {
                    value: 200,
                    message: "Description must be less than 200 characters",
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormTextInput
                    label="Description"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter description (optional)"
                    multiline
                    numberOfLines={3}
                    leftIcon={<SymbolView name="text.alignleft" />}
                  />
                )}
                name="description"
              />
              {errors.description && (
                <ThemedText
                  style={[styles.errorText, { color: "#FF3B30" }]}
                  size="sm"
                >
                  {errors.description.message}
                </ThemedText>
              )}

              <View style={styles.editActions}>
                <Button
                  variant="outline"
                  onPress={handleCancelEdit}
                  disabled={isSubmitting}
                  style={styles.editButton}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.editButton}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <ThemedText size="xl" weight="bold" style={styles.groupName}>
                  {group.name}
                </ThemedText>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={styles.editButton}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name="pencil"
                      tintColor={isDark ? Colors.dark.text : Colors.light.text}
                      size={20}
                    />
                  </TouchableOpacity>
                )}
              </View>
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
          )}
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
            <View style={styles.membersList}>
              {group.members.map((member) => {
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

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberItem,
                      {
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.02)",
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
                        <ThemedText style={styles.memberName} weight="semibold">
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  groupName: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    opacity: 0.7,
    marginTop: 4,
  },
  editForm: {
    width: "100%",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
});
