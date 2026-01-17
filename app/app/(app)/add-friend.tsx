/**
 * @author Composer
 * @description Deep link handler for adding friends via tabbit://add-friend?token=...
 */

import { useEffect } from "react";
import { useLocalSearchParams, router, useSegments } from "expo-router";
import { Alert, ActivityIndicator, View } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { addFriendByToken } from "@/utils/api";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";

export default function AddFriendScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const segments = useSegments();
  const { user } = useAuth();
  const token = params.token;

  useEffect(() => {
    if (!token) {
      Alert.alert("Error", "Invalid friend request link. Missing token.");
      router.replace("/(app)/(tabs)/(profile)");
      return;
    }

    if (!user) {
      // User not authenticated, redirect to auth
      router.replace("/(auth)");
      return;
    }

    handleAddFriend();
  }, [token, user]);

  const handleAddFriend = async () => {
    if (!token) return;

    try {
      const response = await addFriendByToken(token);

      if (response.success && response.friend) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Friend Added",
          `You've successfully added ${response.friend.friendName} as a friend!`,
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(app)/(tabs)/(profile)");
              },
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Failed to Add Friend",
          response.message || "Invalid or expired friend request token.",
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(app)/(tabs)/(profile)");
              },
            },
          ]
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to add friend. Please try again.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/(app)/(tabs)/(profile)");
            },
          },
        ]
      );
    }
  };

  return (
    <ThemedView className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" />
      <ThemedText size="base" className="mt-4 opacity-70">
        Adding friend...
      </ThemedText>
    </ThemedView>
  );
}
