/**
 * @author Composer
 * @description Bottom sheet for member management actions
 */

import { useCallback } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/button";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import type React from "react";
import { useAuth } from "@/contexts/auth-context";
import { removeGroupMember, updateMemberRole } from "@/utils/api";

interface MemberActionsSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  groupId: string;
  member: {
    id: string;
    userId: string;
    role: "admin" | "member";
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  } | null;
  onActionComplete: () => void;
}

export function MemberActionsSheet({
  bottomSheetRef,
  groupId,
  member,
  onActionComplete,
}: MemberActionsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const displayName = member?.user.name || member?.user.email.split("@")[0] || "Unknown";

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleToggleRole = useCallback(async () => {
    if (!member) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newRole = member.role === "admin" ? "member" : "admin";
    const actionText = newRole === "admin" ? "Make Admin" : "Make Member";

    Alert.alert(
      `Confirm ${actionText}`,
      `Are you sure you want to ${actionText.toLowerCase()} ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          style: "destructive",
          onPress: async () => {
            try {
              const result = await updateMemberRole(
                groupId,
                member.id,
                newRole
              );

              if (!result.success) {
                Alert.alert("Error", result.message || "Failed to update role");
                return;
              }

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              bottomSheetRef.current?.dismiss();
              onActionComplete();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to update role"
              );
            }
          },
        },
      ]
    );
  }, [member, groupId, displayName, bottomSheetRef, onActionComplete]);

  const handleRemoveMember = useCallback(async () => {
    if (!member) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${displayName} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await removeGroupMember(groupId, member.id);

              if (!result.success) {
                Alert.alert(
                  "Error",
                  result.message || "Failed to remove member"
                );
                return;
              }

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              bottomSheetRef.current?.dismiss();
              onActionComplete();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to remove member"
              );
            }
          },
        },
      ]
    );
  }, [member, groupId, displayName, bottomSheetRef, onActionComplete]);

  if (!member) return null;

  const isCreator = member.userId === member.user.id;
  const canChangeRole = !isCreator;
  const canRemove = !isCreator && member.userId !== user?.id;

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
      detents={["auto"]}
    >
      <View className="flex-1 px-6 pt-8 pb-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <ThemedText size="xl" weight="bold">
            Member Actions
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="xmark.circle.fill"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={28}
            />
          </TouchableOpacity>
        </View>

        {/* Member Info */}
        <View className="items-center mb-8">
          <View className="mb-4">
            <Avatar
              name={displayName}
              imageUrl={member.user.image}
              size={80}
            />
          </View>
          <ThemedText size="lg" weight="bold" className="mb-1">
            {displayName}
          </ThemedText>
          <View className="flex-row items-center gap-2">
            <Badge variant={member.role === "admin" ? "primary" : "secondary"}>
              {member.role === "admin" ? "Admin" : "Member"}
            </Badge>
            {isCreator && (
              <View
                className="flex-row items-center gap-1 px-2 py-1 rounded-full"
                style={{ backgroundColor: "rgba(255, 215, 0, 0.2)" }}
              >
                <SymbolView name="crown.fill" tintColor="#FFD700" size={12} />
                <ThemedText
                  size="xs"
                  style={{ color: "#FFD700" }}
                  weight="semibold"
                >
                  Creator
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          {canChangeRole && (
            <Button
              variant="secondary"
              size="lg"
              onPress={handleToggleRole}
              fullWidth
              leftIcon={
                <SymbolView
                  name={member.role === "admin" ? "person.2" : "person.badge.key.fill"}
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                  size={20}
                />
              }
            >
              {member.role === "admin" ? "Make Member" : "Make Admin"}
            </Button>
          )}

          {canRemove && (
            <Button
              variant="danger"
              size="lg"
              onPress={handleRemoveMember}
              fullWidth
              leftIcon={
                <SymbolView
                  name="person.crop.circle.badge.xmark"
                  tintColor="white"
                  size={20}
                />
              }
            >
              Remove from Group
            </Button>
          )}

          {!canChangeRole && !canRemove && (
            <View
              className="p-4 rounded-xl items-center"
              style={{
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              }}
            >
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
                className="text-center"
              >
                {isCreator
                  ? "The group creator cannot be removed or have their role changed."
                  : "You cannot perform actions on yourself."}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </TrueSheet>
  );
}
