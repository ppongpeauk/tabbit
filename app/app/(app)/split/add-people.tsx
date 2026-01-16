import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { SplitStrategy } from "@/utils/split";
import { AddPeopleSelector } from "@/components/add-people-selector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useCreateFriend } from "@/hooks/use-friends";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { FormTextInput } from "@/components/form-text-input";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

interface AddPeopleFormData {
  selectedFriendIds: string[];
}

export default function AddPeopleScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
  } | null>(null);
  const addPersonSheetRef = useRef<TrueSheet | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const createFriendMutation = useCreateFriend();

  const methods = useForm<AddPeopleFormData>({
    defaultValues: {
      selectedFriendIds: [],
    },
  });

  const { watch, setValue } = methods;
  const selectedFriendIds = watch("selectedFriendIds");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
    });
  }, [navigation]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const tempDataStr = await AsyncStorage.getItem(SPLIT_DATA_KEY);
      if (!tempDataStr) {
        Alert.alert("Error", "Missing split data");
        router.replace("/split");
        return;
      }
      const tempData = JSON.parse(tempDataStr);
      setSplitData(tempData);

      if (tempData.selectedFriendIds) {
        setValue("selectedFriendIds", tempData.selectedFriendIds);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [setValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleContinue = useCallback(async () => {
    if (selectedFriendIds.length === 0) {
      Alert.alert("Error", "Please select at least one person");
      return;
    }

    if (!splitData) {
      Alert.alert("Error", "Missing split data");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await AsyncStorage.setItem(
      SPLIT_DATA_KEY,
      JSON.stringify({
        ...splitData,
        selectedFriendIds,
      })
    );

    if (
      splitData.strategy === SplitStrategy.CUSTOM ||
      splitData.strategy === "custom"
    ) {
      router.push("/split/custom-inputs");
    } else if (
      splitData.strategy === SplitStrategy.PERCENTAGE ||
      splitData.strategy === "percentage"
    ) {
      router.push("/split/percentage-inputs");
    } else if (
      splitData.strategy === SplitStrategy.ITEMIZED ||
      splitData.strategy === "itemized"
    ) {
      router.push("/split/itemized-assign");
    } else {
      router.push("/split/review");
    }
  }, [selectedFriendIds, splitData]);

  const handleOpenAddPerson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewPersonName("");
    addPersonSheetRef.current?.present();
  }, []);

  const handleSaveNewPerson = useCallback(async () => {
    const trimmedName = newPersonName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Name is required");
      return;
    }

    try {
      const newPerson = await createFriendMutation.mutateAsync({
        name: trimmedName,
      });
      setValue("selectedFriendIds", [
        ...selectedFriendIds,
        newPerson.id,
      ]);
      addPersonSheetRef.current?.dismiss();
    } catch (error) {
      Alert.alert("Error", "Failed to add person");
    }
  }, [newPersonName, createFriendMutation, selectedFriendIds, setValue]);

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
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
      </View>
    );
  }

  return (
    <FormProvider {...methods}>
      <View
        className="flex-1"
        style={{
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        }}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator
              size="large"
              color={isDark ? Colors.dark.text : Colors.light.text}
            />
          </View>
        ) : (
          <>
            <View className="flex-1 pb-0">
              <View className="flex-1 gap-4 px-5">
                <AddPeopleSelector
                  name="selectedFriendIds"
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleOpenAddPerson}
                  className={`rounded-xl p-4 gap-1 ${
                    isDark ? "bg-[#1A1D1E]" : "bg-white"
                  }`}
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.2)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <SymbolView
                        name="plus"
                        tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                        style={{ width: 24, height: 24 }}
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText size="base" weight="semibold">
                        Add Someone Not In Contacts
                      </ThemedText>
                      <ThemedText
                        size="sm"
                        style={{
                          color: isDark ? Colors.dark.subtle : Colors.light.icon,
                        }}
                      >
                        Create a reusable person for future splits
                      </ThemedText>
                    </View>
                    <SymbolView
                      name="chevron.right"
                      tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                      style={{ width: 16, height: 16 }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Continue Button */}
            <View
              className="absolute bottom-0 left-0 right-0 px-5 pt-4 pb-10 border-t"
              style={{
                backgroundColor: isDark
                  ? Colors.dark.background
                  : Colors.light.background,
                borderTopColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              }}
            >
              <Button
                variant="primary"
                onPress={handleContinue}
                disabled={selectedFriendIds.length === 0}
                fullWidth
              >
                Continue
              </Button>
            </View>
          </>
        )}
      </View>

      <TrueSheet
        ref={addPersonSheetRef}
        backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
        cornerRadius={24}
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
            <FormTextInput
              label="Name"
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Enter name"
              autoFocus
            />
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                onPress={() => addPersonSheetRef.current?.dismiss()}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSaveNewPerson}
                style={{ flex: 1 }}
                disabled={!newPersonName.trim()}
              >
                Save
              </Button>
            </View>
          </View>
        </ScrollView>
      </TrueSheet>
    </FormProvider>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)
