/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Screen for manually entering receipt information
 */

import { useState, useLayoutEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedView } from "@/components/themed-view";
import { ManualReceiptForm } from "@/components/manual-receipt-form";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveReceipt } from "@/utils/storage";
import { useLimits } from "@/hooks/use-limits";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { presentPaywall } from "@/utils/paywall";
import type {
  Merchant,
  Transaction,
  Totals,
  ReceiptItem,
  ReturnInfo,
} from "@/utils/api";

interface ManualReceiptFormData {
  name: string;
  merchant: Merchant;
  transaction: Transaction;
  items: ReceiptItem[];
  totals: Totals;
  returnInfo?: ReturnInfo;
  userNotes?: string;
}

export default function CreateManualReceiptScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const [saving, setSaving] = useState(false);
  const { checkSaveLimit, refresh: refreshLimits } = useLimits();
  const { isPro } = useRevenueCat();
  const isSavingRef = useRef(false);
  const isCancellingRef = useRef(false);

  const handleSave = useCallback(
    async (formData: ManualReceiptFormData) => {
      // Check save limit for free users
      if (!isPro) {
        const limitCheck = await checkSaveLimit();
        if (!limitCheck.allowed) {
          Alert.alert(
            "Receipt Storage Limit Reached",
            limitCheck.reason ||
              "You've reached your receipt storage limit. Upgrade to Pro for unlimited storage.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Upgrade to Pro",
                onPress: async () => {
                  await presentPaywall();
                },
              },
            ]
          );
          return;
        }
      }

      setSaving(true);
      isSavingRef.current = true;
      try {
        await saveReceipt({
          name: formData.name || formData.merchant.name,
          merchant: formData.merchant,
          transaction: formData.transaction,
          items: formData.items,
          totals: formData.totals,
          returnInfo: formData.returnInfo,
          appData: formData.userNotes
            ? { userNotes: formData.userNotes }
            : undefined,
          technical: {
            source: "manual",
          },
        });

        // Refresh limits after saving
        await refreshLimits();

        router.back();
      } catch (error) {
        isSavingRef.current = false;
        Alert.alert("Error", "Failed to save receipt");
        console.error("Error saving receipt:", error);
      } finally {
        setSaving(false);
      }
    },
    [isPro, checkSaveLimit, refreshLimits]
  );

  const [hasFormData, setHasFormData] = useState(false);

  const handleCancel = useCallback(() => {
    if (hasFormData) {
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              isCancellingRef.current = true;
              router.back();
            },
          },
        ]
      );
    } else {
      isCancellingRef.current = true;
      router.back();
    }
  }, [hasFormData]);

  const handleFormDataChange = useCallback((hasData: boolean) => {
    setHasFormData(hasData);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={handleCancel}
          hitSlop={8}
          style={styles.headerButton}
        >
          <SymbolView
            name="chevron.left"
            tintColor={
              colorScheme === "dark" ? Colors.dark.text : Colors.light.text
            }
          />
        </Pressable>
      ),
      title: "Manual Entry",
    });
  }, [navigation, colorScheme, handleCancel]);

  // Handle back button with confirmation if form has data
  useFocusEffect(
    useCallback(() => {
      const onBeforeRemove = (e: { preventDefault: () => void }) => {
        // Allow navigation if we're saving (intentional navigation)
        if (isSavingRef.current) {
          isSavingRef.current = false;
          return;
        }

        if (isCancellingRef.current) {
          isCancellingRef.current = false;
          return;
        }

        // If there's no form data, allow the navigation
        if (!hasFormData) {
          return;
        }

        // Prevent default behavior of leaving the screen
        e.preventDefault();

        // Prompt the user before leaving the screen
        Alert.alert(
          "Discard changes?",
          "You have unsaved changes. Are you sure you want to discard them?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {},
            },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                navigation.removeListener("beforeRemove", onBeforeRemove);
                router.back();
              },
            },
          ]
        );
      };

      const unsubscribe = navigation.addListener(
        "beforeRemove",
        onBeforeRemove
      );

      return unsubscribe;
    }, [navigation, hasFormData])
  );

  return (
    <View style={styles.container}>
      <ThemedView style={styles.container}>
        {saving ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={
                colorScheme === "dark" ? Colors.dark.text : Colors.light.text
              }
            />
          </View>
        ) : (
          <ManualReceiptForm
            onSave={handleSave}
            onCancel={handleCancel}
            onFormDataChange={handleFormDataChange}
          />
        )}
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
