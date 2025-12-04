import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import {
  getFriends,
  saveFriend,
  deleteFriend,
  updateFriend,
  type Friend,
} from "@/utils/storage";
import { FormTextInput } from "@/components/form-text-input";

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const loadFriends = useCallback(async () => {
    try {
      const loadedFriends = await getFriends();
      setFriends(loadedFriends);
    } catch (error) {
      console.error("Error loading friends:", error);
      Alert.alert("Error", "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

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
    async (friend: Friend) => {
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
            onPress: async () => {
              try {
                await deleteFriend(friend.id);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                await loadFriends();
              } catch (error) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
                Alert.alert("Error", "Failed to delete friend");
              }
            },
          },
        ]
      );
    },
    [loadFriends]
  );

  const handleSaveFriend = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    try {
      if (editingFriend) {
        await updateFriend(editingFriend.id, {
          name: name.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowEditModal(false);
        setEditingFriend(null);
      } else {
        await saveFriend({
          name: name.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          email: email.trim() || undefined,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddModal(false);
      }
      setName("");
      setPhoneNumber("");
      setEmail("");
      await loadFriends();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save friend");
    }
  }, [name, phoneNumber, email, editingFriend, loadFriends]);


  const renderFriendItem = useCallback(
    ({ item }: { item: Friend }) => (
      <View
        style={[
          styles.friendItem,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.02)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <View style={styles.friendInfo}>
          <ThemedText size="base" weight="semibold">
            {item.name}
          </ThemedText>
          {(item.phoneNumber || item.email) && (
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
                marginTop: 4,
              }}
            >
              {item.phoneNumber || item.email}
            </ThemedText>
          )}
        </View>
        <View style={styles.friendActions}>
          <Pressable
            onPress={() => handleEditFriend(item)}
            style={styles.actionButton}
          >
            <SymbolView
              name="pencil"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
          <Pressable
            onPress={() => handleDeleteFriend(item)}
            style={styles.actionButton}
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
      <ThemedView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
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
        <ScrollView style={styles.modalContent}>
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
        <View style={styles.modalFooter}>
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
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ThemedText>Loading...</ThemedText>
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
      <View style={styles.header}>
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
        <View style={styles.emptyState}>
          <ThemedText size="lg" style={{ opacity: 0.7 }}>
            No friends yet
          </ThemedText>
          <ThemedText size="sm" style={{ opacity: 0.5, marginTop: 8 }}>
            Add friends manually. Device contacts are available when splitting receipts.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {renderModal(false)}
      {renderModal(true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendInfo: {
    flex: 1,
  },
  friendActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
});
