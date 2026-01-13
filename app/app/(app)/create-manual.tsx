/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Screen for manually entering receipt information
 */

import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { router, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { PlatformPressable } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView } from "@/components/themed-view";
import { ManualReceiptForm, type ManualReceiptFormRef } from "@/components/manual-receipt-form";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveReceipt } from "@/utils/storage";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
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
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);
  const isCancellingRef = useRef(false);
  const formRef = useRef<ManualReceiptFormRef | null>(null);

  const handleSave = useCallback(
    async (formData: ManualReceiptFormData) => {
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

        router.back();
      } catch (error) {
        isSavingRef.current = false;
        Alert.alert("Error", "Failed to save receipt");
        console.error("Error saving receipt:", error);
      } finally {
        setSaving(false);
      }
    },
    []
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

  const handleToolbarSave = useCallback(async () => {
    if (formRef.current) {
      await formRef.current.save();
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Manual Entry",
      headerLeft: () => (
        <PlatformPressable
          onPress={handleCancel}
          hitSlop={8}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView
            name="xmark"
            tintColor={
              colorScheme === "dark" ? Colors.dark.text : Colors.light.text
            }
          />
        </PlatformPressable>
      ),
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
    <View className="flex-1">
      <ThemedView className="flex-1">
        {saving ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator
              size="large"
              color={
                colorScheme === "dark" ? Colors.dark.text : Colors.light.text
              }
            />
          </View>
        ) : (
          <>
            <ManualReceiptForm
              ref={formRef}
              onSave={handleSave}
              onFormDataChange={handleFormDataChange}
            />
            <Toolbar bottom={Math.max(insets.bottom, 20)}>
              <ToolbarButton
                onPress={handleCancel}
                icon="xmark"
                label="Cancel"
                variant="glass"
              />
              <ToolbarButton
                onPress={handleToolbarSave}
                icon="checkmark"
                label="Save Receipt"
                variant="glass"
              />
            </Toolbar>
          </>
        )}
      </ThemedView>
    </View>
  );
}
