import {
  useLayoutEffect,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { View, Alert, ActivityIndicator, TextInput } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import type { ReceiptVisibility, StoredReceipt } from "@/utils/storage";
import * as Haptics from "expo-haptics";
import {
  ManualReceiptForm,
  type ManualReceiptFormRef,
} from "@/components/manual-receipt-form";
import type { ManualReceiptHeaderFields } from "@/components/manual-receipt-header-fields";
import { ManualReceiptHeaderSheet } from "@/components/manual-receipt-header-sheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Toolbar, ToolbarButton } from "@/components/toolbar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton, PlatformPressable } from "@react-navigation/elements";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const formRef = useRef<ManualReceiptFormRef | null>(null);
  const headerSheetRef = useRef<TrueSheet>(null);
  const [headerFields, setHeaderFields] =
    useState<ManualReceiptHeaderFields | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [visibility, setVisibility] = useState<ReceiptVisibility>("private");

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

  const handleHeaderPress = useCallback(() => {
    headerSheetRef.current?.present();
  }, []);

  const handleHeaderFieldsChange = useCallback(
    (updates: Partial<ManualReceiptHeaderFields>) => {
      setHeaderFields((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    []
  );

  useEffect(() => {
    if (!receipt || headerFields) return;

    const date = new Date(receipt.transaction.datetime);
    const dateString = Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
    const transactionDate = dateString.slice(0, 10);
    const transactionTime = dateString.slice(11, 16);

    setHeaderFields({
      name: receipt.name || "Untitled",
      merchantName: receipt.merchant.name || "",
      merchantAddressLine1: receipt.merchant.address?.line1 || "",
      merchantCity: receipt.merchant.address?.city || "",
      merchantState: receipt.merchant.address?.state || "",
      merchantPostalCode: receipt.merchant.address?.postalCode || "",
      merchantCountry: receipt.merchant.address?.country || "",
      merchantPhone: receipt.merchant.phone || "",
      merchantReceiptNumber: receipt.merchant.receiptNumber || "",
      transactionDate,
      transactionTime,
      currency: receipt.totals.currency || "USD",
    });
    setUserNotes(receipt.appData?.userNotes || "");
    setVisibility(receipt.visibility || "private");
  }, [receipt, headerFields]);

  useLayoutEffect(() => {
    const displayTitle = headerFields?.name.trim() || "Edit Receipt";
    navigation.setOptions({
      title: displayTitle,
      headerTitle: () => (
        <PlatformPressable
          onPress={handleHeaderPress}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit receipt details"
        >
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
        </PlatformPressable>
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
    headerFields?.name,
  ]);

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

  if (!receipt || !headerFields) {
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

  const handleFormSave = async (formData: {
    name: string;
    merchant: StoredReceipt["merchant"];
    transaction: StoredReceipt["transaction"];
    items: StoredReceipt["items"];
    totals: StoredReceipt["totals"];
  }) => {
    const nextReceipt: Partial<StoredReceipt> = {
      name: formData.name,
      merchant: {
        ...receipt.merchant,
        ...formData.merchant,
      },
      transaction: {
        ...receipt.transaction,
        ...formData.transaction,
      },
      items: formData.items,
      totals: {
        ...receipt.totals,
        ...formData.totals,
      },
      appData: {
        ...receipt.appData,
        userNotes: userNotes.trim() || undefined,
      },
      visibility,
    };

    await handleSave(nextReceipt);
  };

  const handleToolbarSave = useCallback(async () => {
    if (formRef.current) {
      await formRef.current.save();
    }
  }, []);

  return (
    <View className="flex-1">
      <ThemedView className="flex-1">
        <ManualReceiptForm
          ref={formRef}
          onSave={handleFormSave}
          headerFields={headerFields}
          initialItems={receipt.items}
          initialTotals={receipt.totals}
        >
          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Privacy
            </ThemedText>
            <View className="flex-row gap-3">
              <View
                className={`flex-1 rounded-xl border p-3 ${
                  visibility === "private" ? "border-blue-500" : ""
                }`}
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor:
                    visibility === "private"
                      ? Colors.light.tint
                      : isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <PlatformPressable
                  onPress={() => setVisibility("private")}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center gap-2">
                    <SymbolView
                      name="lock"
                      size={16}
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                    <ThemedText size="base" weight="semibold">
                      Private
                    </ThemedText>
                  </View>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Only you can view this receipt
                  </ThemedText>
                </PlatformPressable>
              </View>
              <View
                className={`flex-1 rounded-xl border p-3 ${
                  visibility === "public" ? "border-blue-500" : ""
                }`}
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor:
                    visibility === "public"
                      ? Colors.light.tint
                      : isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <PlatformPressable
                  onPress={() => setVisibility("public")}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center gap-2">
                    <SymbolView
                      name="globe"
                      size={16}
                      tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                    />
                    <ThemedText size="base" weight="semibold">
                      Public
                    </ThemedText>
                  </View>
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark ? Colors.dark.icon : Colors.light.icon,
                    }}
                  >
                    Anyone with a link can view
                  </ThemedText>
                </PlatformPressable>
              </View>
            </View>
          </View>

          <View className="mt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Notes
            </ThemedText>
            <TextInput
              value={userNotes}
              onChangeText={setUserNotes}
              placeholder="Add notes about this receipt..."
              placeholderTextColor={
                isDark ? Colors.dark.icon : Colors.light.icon
              }
              multiline
              numberOfLines={4}
              className="rounded-xl border p-3"
              style={{
                minHeight: 120,
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: isDark ? Colors.dark.text : Colors.light.text,
              }}
            />
          </View>
        </ManualReceiptForm>
      </ThemedView>

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
    </View>
  );
}
