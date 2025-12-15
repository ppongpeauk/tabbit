import { useLayoutEffect, useCallback } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
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
      <View style={styles.container}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText}>
              Loading receipt...
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.container}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>
              Receipt not found
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedView style={styles.container}>
        <ReceiptEditForm
          receipt={receipt}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
