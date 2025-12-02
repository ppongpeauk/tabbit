/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Edit receipt screen
 */

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { View, StyleSheet, Alert } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ReceiptEditForm } from "@/components/receipt-edit-form";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getReceipts,
  updateReceipt,
  type StoredReceipt,
} from "@/utils/storage";
import * as Haptics from "expo-haptics";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  useEffect(() => {
    const loadReceipt = async () => {
      const receipts = await getReceipts();
      const found = receipts.find((r) => r.id === id);
      setReceipt(found || null);
    };
    loadReceipt();
  }, [id]);

  const handleSave = useCallback(
    async (updatedReceipt: Partial<StoredReceipt>) => {
      try {
        await updateReceipt(id, updatedReceipt);
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
    [id]
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

  if (!receipt) {
    return (
      <View style={styles.container}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>
              Loading receipt...
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
