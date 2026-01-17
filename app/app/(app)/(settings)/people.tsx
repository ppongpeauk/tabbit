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

export default function PeopleScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: people = [], isLoading: loading } = useFriends();
  const deletePersonMutation = useDeleteFriend();


  const handleDeletePerson = useCallback(
    (person: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Remove Person",
        `Are you sure you want to remove ${person.friendName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              deletePersonMutation.mutate(person.friendId, {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                },
                onError: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                  );
                  Alert.alert("Error", "Failed to remove person");
                },
              });
            },
          },
        ]
      );
    },
    [deletePersonMutation]
  );


  const renderPersonItem = useCallback(
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
          <Pressable onPress={() => handleDeletePerson(item)} className="p-2">
            <SymbolView
              name="trash"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
        </View>
      </View>
    ),
    [isDark, handleDeletePerson]
  );


  if (loading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
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
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
      }}
    >
      <View className="flex-row gap-3 px-5 py-4">
        <Button
          variant="secondary"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Add Friend",
              "To add people, use the 'Add Friend' button on your profile screen to share your QR code or scan someone else's.",
              [{ text: "OK" }]
            );
          }}
          leftIcon={<SymbolView name="plus" />}
          fullWidth
        >
          Add Person
        </Button>
      </View>

      {people.length === 0 ? (
        <View className="flex-1 justify-center items-center px-5">
          <ThemedText size="lg" className="opacity-70">
            No people yet
          </ThemedText>
          <ThemedText size="sm" className="opacity-50 mt-2">
            Add people you want to reuse for splits.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={renderPersonItem}
          contentContainerClassName="px-5 pb-5"
        />
      )}

    </View>
  );
}
