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
import { Colors } from "@/constants/theme";
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

export default function PeopleScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Friend | null>(null);
  const [name, setName] = useState("");

  const { data: people = [], isLoading: loading } = useFriends();
  const createPersonMutation = useCreateFriend();
  const updatePersonMutation = useUpdateFriend();
  const deletePersonMutation = useDeleteFriend();

  const handleAddPerson = useCallback(() => {
    setName("");
    setShowAddModal(true);
  }, []);

  const handleEditPerson = useCallback((person: Friend) => {
    setEditingPerson(person);
    setName(person.name);
    setShowEditModal(true);
  }, []);

  const handleDeletePerson = useCallback(
    (person: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Delete Person",
        `Are you sure you want to delete ${person.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deletePersonMutation.mutate(person.id, {
                onSuccess: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                },
                onError: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                  );
                  Alert.alert("Error", "Failed to delete person");
                },
              });
            },
          },
        ]
      );
    },
    [deletePersonMutation]
  );

  const handleSavePerson = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    const personData = {
      name: name.trim(),
    };

    if (editingPerson) {
      updatePersonMutation.mutate(
        {
          id: editingPerson.id,
          updates: personData,
        },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowEditModal(false);
            setEditingPerson(null);
            setName("");
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to save person");
          },
        }
      );
    } else {
      createPersonMutation.mutate(personData, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddModal(false);
          setName("");
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to save person");
        },
      });
    }
  }, [name, editingPerson, createPersonMutation, updatePersonMutation]);

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
            {item.name}
          </ThemedText>
        </View>
        <View className="flex-row gap-3">
          <Pressable onPress={() => handleEditPerson(item)} className="p-2">
            <SymbolView
              name="pencil"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
          <Pressable onPress={() => handleDeletePerson(item)} className="p-2">
            <SymbolView
              name="trash"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
            />
          </Pressable>
        </View>
      </View>
    ),
    [isDark, handleEditPerson, handleDeletePerson]
  );

  const renderModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (isEdit) {
          setShowEditModal(false);
          setEditingPerson(null);
        } else {
          setShowAddModal(false);
        }
        setName("");
      }}
    >
      <ThemedView className="flex-1">
        <View className="flex-row justify-between items-center px-5 py-4 border-b border-black/10 dark:border-white/10">
          <ThemedText size="xl" weight="bold">
            {isEdit ? "Edit Person" : "Add Person"}
          </ThemedText>
          <Pressable
            onPress={() => {
              if (isEdit) {
                setShowEditModal(false);
                setEditingPerson(null);
              } else {
                setShowAddModal(false);
              }
              setName("");
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
        </ScrollView>
        <View className="flex-row gap-3 px-5 py-4 border-t border-black/10 dark:border-white/10">
          <Button
            variant="secondary"
            onPress={() => {
              if (isEdit) {
                setShowEditModal(false);
                setEditingPerson(null);
              } else {
                setShowAddModal(false);
              }
              setName("");
            }}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSavePerson}
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
          onPress={handleAddPerson}
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

      {renderModal(false)}
      {renderModal(true)}
    </View>
  );
}
