import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useForm, FormProvider } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { SplitStrategy } from "@/utils/split";
import { AddPeopleSelector } from "@/components/add-people-selector";
import { EmptyState } from "@/components/empty-state";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

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
      router.push("/split/custom-inputs");
    } else if (
      splitData.strategy === SplitStrategy.ITEMIZED ||
      splitData.strategy === "itemized"
    ) {
      router.push("/split/itemized-assign");
    } else {
      router.push("/split/review");
    }
  }, [selectedFriendIds, splitData]);

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
    </FormProvider>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)
