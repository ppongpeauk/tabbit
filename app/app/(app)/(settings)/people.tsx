import { useCallback, useRef } from "react";
import {
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  useCreateFriend,
} from "@/hooks/use-friends";
import type { Friend } from "@/utils/storage";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { FormTextInput } from "@/components/form-text-input";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Avatar } from "@/components/avatar";

interface AddPersonFormData {
  name: string;
}

export default function PeopleScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: people = [], isLoading: loading } = useFriends();
  const deletePersonMutation = useDeleteFriend();
  const createFriendMutation = useCreateFriend();
  const addPersonSheetRef = useRef<TrueSheet | null>(null);

  const methods = useForm<AddPersonFormData>({
    defaultValues: {
      name: "",
    },
  });

  const { handleSubmit, control, reset, formState: { errors } } = methods;

  const handleDeletePerson = useCallback(
    (person: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Remove Person",
        `Are you sure you want to remove ${person.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
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

  const handleOpenAddPerson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset({ name: "" });
    addPersonSheetRef.current?.present();
  }, [reset]);

  const handleSaveNewPerson = useCallback(async (data: AddPersonFormData) => {
    const trimmedName = data.name.trim();

    const isDuplicate = people.some(
      (person) => person.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("Error", "A person with this name already exists");
      return;
    }

    try {
      await createFriendMutation.mutateAsync({
        name: trimmedName,
      });
      reset({ name: "" });
      addPersonSheetRef.current?.dismiss();
    } catch {
      Alert.alert("Error", "Failed to add person");
    }
  }, [people, createFriendMutation, reset]);


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
        <View className="flex-row items-center flex-1">
          <Avatar name={item.name} imageUrl={item.image} size={44} />
          <View className="ml-3 flex-1">
            <ThemedText size="base" weight="semibold">
              {item.name}
            </ThemedText>
            {item.email && (
              <ThemedText
                size="sm"
                className="mt-0.5"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                {item.email}
              </ThemedText>
            )}
          </View>
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
    <FormProvider {...methods}>
      <View
        className="flex-1"
        style={{
          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        }}
      >
        <View className="flex-row gap-3 px-5 py-4">
          <Button
            variant="secondary"
            onPress={handleOpenAddPerson}
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

        <TrueSheet
          ref={addPersonSheetRef}
          backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
          scrollable
        >
          <ScrollView
            contentContainerClassName="px-6 py-8"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View className="gap-3">
              <ThemedText size="xl" weight="bold">
                Add Person
              </ThemedText>
              <Controller
                control={control}
                name="name"
                rules={{
                  required: "Name is required",
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    const isDuplicate = people.some(
                      (person) => person.name.trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (isDuplicate) {
                      return "A person with this name already exists";
                    }
                    return true;
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <FormTextInput
                      label="Name"
                      value={value}
                      onChangeText={(text) => onChange(text.trimStart())}
                      onBlur={() => {
                        onBlur();
                        const trimmed = value.trim();
                        if (trimmed !== value) {
                          onChange(trimmed);
                        }
                      }}
                      placeholder="Enter name"
                      autoFocus
                    />
                    {errors.name && (
                      <ThemedText
                        size="sm"
                        style={{ color: "#ff4444", marginTop: -12 }}
                      >
                        {errors.name.message}
                      </ThemedText>
                    )}
                  </>
                )}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  onPress={() => {
                    reset({ name: "" });
                    addPersonSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmit(handleSaveNewPerson)}
                  style={{ flex: 1 }}
                >
                  Save
                </Button>
              </View>
            </View>
          </ScrollView>
        </TrueSheet>
      </View>
    </FormProvider>
  );
}
