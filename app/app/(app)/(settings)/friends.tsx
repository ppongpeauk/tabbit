import { useState, useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import {
  useFriends,
  useCreateFriend,
  useUpdateFriend,
  useDeleteFriend,
} from "@/hooks/use-friends";
import type { Friend } from "@/utils/storage";
import { FormTextInput } from "@/components/form-text-input";

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  // Use React Query hooks
  const { data: friends = [], isLoading: loading } = useFriends();
  const createFriendMutation = useCreateFriend();
  const updateFriendMutation = useUpdateFriend();
  const deleteFriendMutation = useDeleteFriend();

  const handleAddFriend = useCallback(() => {
    setName("");
    setPhoneNumber("");
    setEmail("");
    setShowAddModal(true);
  }, []);

  const handleEditFriend = useCallback((friend: Friend) => {
    setEditingFriend(friend);
    setName(friend.name);
    setPhoneNumber(friend.phoneNumber || "");
    setEmail(friend.email || "");
    setShowEditModal(true);
  }, []);

  const handleDeleteFriend = useCallback(
    (friend: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Friend",
        `Are you sure you want to delete ${friend.name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteFriendMutation.mutate(friend.id, {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                },
                onError: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                  );
                  Alert.alert("Error", "Failed to delete friend");
                },
              });
            },
          },
        ]
      );
    },
    [deleteFriendMutation]
  );

  const handleSaveFriend = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    const friendData = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      email: email.trim() || undefined,
    };

    if (editingFriend) {
      updateFriendMutation.mutate(
        {
          id: editingFriend.id,
          updates: friendData,
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowEditModal(false);
            setEditingFriend(null);
            setName("");
            setPhoneNumber("");
            setEmail("");
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to save friend");
          },
        }
      );
    } else {
      createFriendMutation.mutate(friendData, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddModal(false);
          setName("");
          setPhoneNumber("");
          setEmail("");
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to save friend");
        },
      });
    }
  }, [
    name,
    phoneNumber,
    email,
    editingFriend,
    createFriendMutation,
    updateFriendMutation,
  ]);

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
            {item.name}
          </ThemedText>
          {(item.phoneNumber || item.email) && (
            <ThemedText
              size="sm"
              className="mt-1"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              {item.phoneNumber || item.email}
            </ThemedText>
          )}
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handleEditFriend(item)}
            className="p-2"
          >
            <SymbolView
              name="pencil"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
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
    [isDark, handleEditFriend, handleDeleteFriend]
  );

  const renderModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (isEdit) {
          setShowEditModal(false);
          setEditingFriend(null);
        } else {
          setShowAddModal(false);
        }
        setName("");
        setPhoneNumber("");
        setEmail("");
      }}
    >
      <ThemedView className="flex-1">
        <View className="flex-row justify-between items-center px-5 py-4 border-b border-black/10 dark:border-white/10">
          <ThemedText size="xl" weight="bold">
            {isEdit ? "Edit Friend" : "Add Friend"}
          </ThemedText>
          <Pressable
            onPress={() => {
              if (isEdit) {
                setShowEditModal(false);
                setEditingFriend(null);
              } else {
                setShowAddModal(false);
              }
              setName("");
              setPhoneNumber("");
              setEmail("");
            }}
          >
            <SymbolView
              name="xmark"
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
            />
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-5 pt-5">
          <FormTextInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            autoFocus
          />
          <FormTextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <FormTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ScrollView>
        <View className="flex-row gap-3 px-5 py-4 border-t border-black/10 dark:border-white/10">
          <Button
            variant="secondary"
            onPress={() => {
              if (isEdit) {
                setShowEditModal(false);
                setEditingFriend(null);
              } else {
                setShowAddModal(false);
              }
              setName("");
              setPhoneNumber("");
              setEmail("");
            }}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSaveFriend}
            style={{ flex: 1 }}
          >
            Save
          </Button>
        </View>
      </ThemedView>
    </Modal>
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
          <ThemedText size="sm" className="opacity-50 mt-2">
            Add friends manually. Device contacts are available when splitting
            receipts.
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

      {renderModal(false)}
      {renderModal(true)}
    </View>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)

