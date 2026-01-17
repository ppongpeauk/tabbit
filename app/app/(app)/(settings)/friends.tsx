import { useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import {
  useFriends,
  useDeleteFriend,
} from "@/hooks/use-friends";
import type { Friend } from "@/utils/api";
import { router } from "expo-router";

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Use React Query hooks
  const { data: friends = [], isLoading: loading } = useFriends();
  const deleteFriendMutation = useDeleteFriend();

  const handleAddFriend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/(tabs)/(profile)");
    // The profile screen will handle opening the friend share sheet
  }, []);

  const handleDeleteFriend = useCallback(
    (friend: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Remove Friend",
        `Are you sure you want to remove ${friend.friendName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              deleteFriendMutation.mutate(friend.friendId, {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                },
                onError: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                  );
                  Alert.alert("Error", "Failed to remove friend");
                },
              });
            },
          },
        ]
      );
    },
    [deleteFriendMutation]
  );

  const renderFriendItem = useCallback(
    ({ item }: { item: Friend }) => (
      <View
        className="flex-row justify-between items-center py-4 px-4 my-1 rounded-xl border"
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.02)",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <View className="flex-1">
          <ThemedText size="base" weight="semibold">
            {item.friendName}
          </ThemedText>
          {item.friendEmail && (
            <ThemedText
              size="sm"
              className="mt-1"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              {item.friendEmail}
            </ThemedText>
          )}
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handleDeleteFriend(item)}
            className="p-2"
          >
            <SymbolView
              name="trash"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
        </View>
      </View>
    ),
    [isDark, handleDeleteFriend]
  );


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
        <ActivityIndicator size="large" />
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
      <View className="flex-row gap-3 px-5 py-4">
        <Button
          variant="secondary"
          onPress={handleAddFriend}
          leftIcon={<SymbolView name="plus" />}
          fullWidth
        >
          Add Friend
        </Button>
      </View>

      {friends.length === 0 ? (
        <View className="flex-1 justify-center items-center px-5">
          <ThemedText size="lg" className="opacity-70">
            No friends yet
          </ThemedText>
          <ThemedText size="sm" className="opacity-50 mt-2 text-center">
            Add friends by scanning their QR code or sharing your QR code.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriendItem}
          contentContainerClassName="px-5 pb-5"
        />
      )}
    </View>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)

