import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { SplitStrategy } from "@/utils/split";
import { AddPeopleSelector } from "@/components/add-people-selector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useCreateFriend, useFriends } from "@/hooks/use-friends";
import { ThemedText } from "@/components/themed-text";
import { SymbolView } from "expo-symbols";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { FormTextInput } from "@/components/form-text-input";
import { SplitProgressBar } from "@/components/split-progress-bar";
import { useAuth } from "@/contexts/auth-context";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

interface AddPeopleFormData {
  selectedFriendIds: string[];
}

export default function AddPeopleScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [includeYourself, setIncludeYourself] = useState(true);
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
    includeYourself?: boolean;
    tempPeople?: Record<string, string>;
  } | null>(null);
  const addPersonSheetRef = useRef<TrueSheet | null>(null);
  const addTempPersonSheetRef = useRef<TrueSheet | null>(null);
  const [tempPeople, setTempPeople] = useState<Record<string, string>>({});
  const createFriendMutation = useCreateFriend();
  const { data: friends = [] } = useFriends();

  const methods = useForm<AddPeopleFormData>({
    defaultValues: {
      selectedFriendIds: [],
    },
  });

  const addPersonForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  const addTempPersonForm = useForm<{ name: string }>({
    defaultValues: { name: "" },
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

      if (tempData.tempPeople) {
        setTempPeople(tempData.tempPeople);
      }

      const shouldInclude = tempData.includeYourself !== false;
      setIncludeYourself(shouldInclude);

      let friendIds = tempData.selectedFriendIds || [];
      if (shouldInclude && user?.id && !friendIds.includes(user.id)) {
        friendIds = [user.id, ...friendIds];
      } else if (!shouldInclude && user?.id) {
        friendIds = friendIds.filter((id: string) => id !== user.id);
      }
      setValue("selectedFriendIds", friendIds);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [setValue, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIncludeYourselfToggle = useCallback((value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIncludeYourself(value);

    if (value && user?.id) {
      if (!selectedFriendIds.includes(user.id)) {
        setValue("selectedFriendIds", [user.id, ...selectedFriendIds]);
      }
    } else if (!value && user?.id) {
      setValue("selectedFriendIds", selectedFriendIds.filter((id: string) => id !== user.id));
    }
  }, [user, selectedFriendIds, setValue]);

  const handleContinue = useCallback(async () => {
    let finalFriendIds = [...selectedFriendIds];
    if (includeYourself && user?.id && !finalFriendIds.includes(user.id)) {
      finalFriendIds = [user.id, ...finalFriendIds];
    } else if (!includeYourself && user?.id) {
      finalFriendIds = finalFriendIds.filter((id: string) => id !== user.id);
    }

    if (finalFriendIds.length === 0) {
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
        selectedFriendIds: finalFriendIds,
        includeYourself,
        tempPeople,
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
  }, [selectedFriendIds, splitData, includeYourself, user]);

  const handleOpenAddPerson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addPersonForm.reset({ name: "" });
    addPersonSheetRef.current?.present();
  }, [addPersonForm]);

  const handleOpenAddTempPerson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTempPersonForm.reset({ name: "" });
    addTempPersonSheetRef.current?.present();
  }, [addTempPersonForm]);

  const handleSaveNewPerson = useCallback(async (data: { name: string }) => {
    const trimmedName = data.name.trim();

    const allPeopleNames = [
      ...friends.map((f) => f.name),
      ...Object.values(tempPeople),
    ];
    const isDuplicate = allPeopleNames.some(
      (name) => name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("Error", "A person with this name already exists");
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
      addPersonForm.reset({ name: "" });
      addPersonSheetRef.current?.dismiss();
    } catch {
      Alert.alert("Error", "Failed to add person");
    }
  }, [friends, tempPeople, createFriendMutation, selectedFriendIds, setValue, addPersonForm]);

  const handleSaveTempPerson = useCallback(async (data: { name: string }) => {
    const trimmedName = data.name.trim();

    const allPeopleNames = [
      ...friends.map((f) => f.name),
      ...Object.values(tempPeople),
    ];
    const isDuplicate = allPeopleNames.some(
      (name) => name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("Error", "A person with this name already exists");
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const updatedTempPeople = {
      ...tempPeople,
      [tempId]: trimmedName,
    };
    setTempPeople(updatedTempPeople);
    setValue("selectedFriendIds", [
      ...selectedFriendIds,
      tempId,
    ]);
    addTempPersonForm.reset({ name: "" });
    addTempPersonSheetRef.current?.dismiss();
  }, [friends, tempPeople, selectedFriendIds, setValue, addTempPersonForm]);

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
        <SplitProgressBar
          currentStage={2}
          totalStages={4}
          stageLabels={["Method", "People", "Amounts", "Review"]}
        />
        <View className="flex-1 pb-0">
          <View className="flex-1 gap-4 px-5">
            {user && (
              <View
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <ThemedText size="base" weight="semibold">
                      Include yourself
                    </ThemedText>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isDark ? Colors.dark.icon : Colors.light.icon,
                        marginTop: 2,
                      }}
                    >
                      {user.name || user.email}
                    </ThemedText>
                  </View>
                  <Switch
                    value={includeYourself}
                    onValueChange={handleIncludeYourselfToggle}
                    trackColor={{
                      false: isDark
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                      true: isDark ? Colors.dark.tint : Colors.light.tint,
                    }}
                    thumbColor={
                      includeYourself
                        ? isDark
                          ? Colors.dark.background
                          : "white"
                        : isDark
                          ? "rgba(255, 255, 255, 0.5)"
                          : "rgba(0, 0, 0, 0.3)"
                    }
                  />
                </View>
              </View>
            )}

            <AddPeopleSelector
              name="selectedFriendIds"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tempPeople={tempPeople}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenAddPerson}
              className={`rounded-xl p-4 gap-1 ${isDark ? "bg-[#1A1D1E]" : "bg-white"
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
            disabled={
              selectedFriendIds.length === 0 ||
              (includeYourself && !user?.id)
            }
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>

      <FormProvider {...addPersonForm}>
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
                control={addPersonForm.control}
                name="name"
                rules={{
                  required: "Name is required",
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    const allPeopleNames = [
                      ...friends.map((f) => f.name),
                      ...Object.values(tempPeople),
                    ];
                    const isDuplicate = allPeopleNames.some(
                      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
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
                    {addPersonForm.formState.errors.name && (
                      <ThemedText
                        size="sm"
                        style={{ color: "#ff4444", marginTop: -12 }}
                      >
                        {addPersonForm.formState.errors.name.message}
                      </ThemedText>
                    )}
                  </>
                )}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  onPress={() => {
                    addPersonForm.reset({ name: "" });
                    addPersonSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={addPersonForm.handleSubmit(handleSaveNewPerson)}
                  style={{ flex: 1 }}
                >
                  Save
                </Button>
              </View>
            </View>
          </ScrollView>
        </TrueSheet>
      </FormProvider>

      <FormProvider {...addTempPersonForm}>
        <TrueSheet
          ref={addTempPersonSheetRef}
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
                Add Person Not on Platform
              </ThemedText>
              <ThemedText
                size="sm"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                This person will only be added to this split and won&apos;t be saved as a contact.
              </ThemedText>
              <Controller
                control={addTempPersonForm.control}
                name="name"
                rules={{
                  required: "Name is required",
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    const allPeopleNames = [
                      ...friends.map((f) => f.name),
                      ...Object.values(tempPeople),
                    ];
                    const isDuplicate = allPeopleNames.some(
                      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
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
                    {addTempPersonForm.formState.errors.name && (
                      <ThemedText
                        size="sm"
                        style={{ color: "#ff4444", marginTop: -12 }}
                      >
                        {addTempPersonForm.formState.errors.name.message}
                      </ThemedText>
                    )}
                  </>
                )}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  onPress={() => {
                    addTempPersonForm.reset({ name: "" });
                    addTempPersonSheetRef.current?.dismiss();
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={addTempPersonForm.handleSubmit(handleSaveTempPerson)}
                  style={{ flex: 1 }}
                >
                  Add
                </Button>
              </View>
            </View>
          </ScrollView>
        </TrueSheet>
      </FormProvider>
    </FormProvider>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)
