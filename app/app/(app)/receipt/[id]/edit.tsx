import { useLayoutEffect, useCallback } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { View, Alert, ActivityIndicator } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ReceiptEditForm } from "@/components/receipt-edit-form";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import type { StoredReceipt } from "@/utils/storage";
import * as Haptics from "expo-haptics";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  // Use React Query hooks
  const { data: receipt, isLoading } = useReceipt(id);
  const updateReceiptMutation = useUpdateReceipt();

  const handleSave = useCallback(
    async (updatedReceipt: Partial<StoredReceipt>): Promise<void> => {
      if (!id) return;

      try {
        await updateReceiptMutation.mutateAsync({
          id,
          updates: updatedReceipt,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again."
        );
        throw error;
      }
    },
    [id, updateReceiptMutation]
  );

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Edit Receipt",
    });
  }, [navigation, colorScheme, handleCancel]);

  if (isLoading) {
    return (
      <View className="flex-1">
        <ThemedView className="flex-1">
          <View className="flex-1 justify-center items-center p-5">
            <ActivityIndicator size="large" />
            <ThemedText className="text-base opacity-70 mt-4">
              Loading receipt...
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View className="flex-1">
        <ThemedView className="flex-1">
          <View className="flex-1 justify-center items-center p-5">
            <ThemedText className="text-base opacity-70">
              Receipt not found
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ThemedView className="flex-1">
        <ReceiptEditForm
          receipt={receipt}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </ThemedView>
    </View>
  );
}
