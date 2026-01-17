/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Screen for manually entering receipt information
 */

import {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { router, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import {
  ManualReceiptForm,
  type ManualReceiptFormRef,
} from "@/components/manual-receipt-form";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveReceipt } from "@/utils/storage";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import { ManualReceiptHeaderSheet } from "@/components/manual-receipt-header-sheet";
import type { ManualReceiptHeaderFields } from "@/components/manual-receipt-header-fields";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
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
  const headerSheetRef = useRef<TrueSheet>(null);
  const [headerFields, setHeaderFields] = useState<ManualReceiptHeaderFields>({
    name: "Untitled",
    merchantName: "",
    merchantAddressLine1: "",
    merchantCity: "",
    merchantState: "",
    merchantPostalCode: "",
    merchantCountry: "",
    merchantPhone: "",
    merchantReceiptNumber: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    transactionTime: new Date().toTimeString().slice(0, 5),
    currency: "USD",
  });
  const initialHeaderRef = useRef<ManualReceiptHeaderFields>(headerFields);

  const handleSave = useCallback(async (formData: ManualReceiptFormData) => {
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
  }, []);

  const [hasFormData, setHasFormData] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

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

  const handleFormDataChange = useCallback((isDirty: boolean) => {
    setIsFormDirty(isDirty);
  }, []);

  const handleToolbarSave = useCallback(async () => {
    if (formRef.current) {
      await formRef.current.save();
    }
  }, []);

  const handleHeaderPress = useCallback(() => {
    headerSheetRef.current?.present();
  }, []);

  const handleHeaderFieldsChange = useCallback(
    (updates: Partial<ManualReceiptHeaderFields>) => {
      setHeaderFields((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  useLayoutEffect(() => {
    const displayTitle = headerFields.name.trim() || "Untitled";
    navigation.setOptions({
      title: displayTitle,
      headerTitle: () => (
        <HeaderButton
          onPress={handleHeaderPress}
        >
          <View className="flex-row items-center gap-2">
            <ThemedText size="base" weight="bold">
              {displayTitle}
            </ThemedText>
            <SymbolView
              name="chevron.down"
              size={14}
              tintColor={
                colorScheme === "dark" ? Colors.dark.text : Colors.light.text
              }
            />
          </View>
        </HeaderButton>
      ),
      headerLeft: () => (
        <HeaderButton onPress={handleCancel}>
          <SymbolView name="xmark" />
        </HeaderButton>
      ),
    });
  }, [
    navigation,
    colorScheme,
    handleCancel,
    handleHeaderPress,
    headerFields.name,
  ]);

  useEffect(() => {
    const initialHeader = initialHeaderRef.current;
    const isHeaderDirty =
      headerFields.name !== initialHeader.name ||
      headerFields.merchantName !== initialHeader.merchantName ||
      headerFields.merchantAddressLine1 !==
      initialHeader.merchantAddressLine1 ||
      headerFields.merchantCity !== initialHeader.merchantCity ||
      headerFields.merchantState !== initialHeader.merchantState ||
      headerFields.merchantPostalCode !== initialHeader.merchantPostalCode ||
      headerFields.merchantCountry !== initialHeader.merchantCountry ||
      headerFields.merchantPhone !== initialHeader.merchantPhone ||
      headerFields.merchantReceiptNumber !==
      initialHeader.merchantReceiptNumber ||
      headerFields.transactionDate !== initialHeader.transactionDate ||
      headerFields.transactionTime !== initialHeader.transactionTime ||
      headerFields.currency !== initialHeader.currency;

    setHasFormData(isFormDirty || isHeaderDirty);
  }, [headerFields, isFormDirty]);

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
              onPress: () => { },
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
              headerFields={headerFields}
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
            <ManualReceiptHeaderSheet
              bottomSheetRef={headerSheetRef}
              headerFields={headerFields}
              onHeaderFieldsChange={handleHeaderFieldsChange}
            />
          </>
        )}
      </ThemedView>
    </View>
  );
}
