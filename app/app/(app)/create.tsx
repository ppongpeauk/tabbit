import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FormTextInput } from "@/components/form-text-input";
import { Receipt } from "@/components/receipt";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { HeaderButton } from "@react-navigation/elements";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveReceipt } from "@/utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  scanReceipt,
  type Receipt as ReceiptData,
  type Barcode,
} from "@/utils/api";
import { hashImage } from "@/utils/hash";

interface ReceiptFormData {
  name: string;
}

export default function CreateReceiptScreen() {
  const params = useLocalSearchParams<{
    imageUri?: string;
    barcodes?: string;
    scannedBarcode?: string;
  }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isDark = colorScheme === "dark";
  const isSavingRef = useRef(false);
  const barcodePromptShownRef = useRef(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { touchedFields, isDirty },
  } = useForm<ReceiptFormData>({
    defaultValues: {
      name: "",
    },
  });

  // Update form default value when receipt data loads
  useEffect(() => {
    if (receiptData && !touchedFields.name) {
      // Set default to merchant name if field hasn't been touched
      setValue("name", receiptData.merchant.name, { shouldTouch: false });
    }
  }, [receiptData, touchedFields.name, setValue]);

  const handleSave = useCallback(
    async (formData: ReceiptFormData) => {
      if (!receiptData) {
        Alert.alert("Error", "Receipt data is not ready yet");
        return;
      }

      setSaving(true);
      isSavingRef.current = true;
      try {
        const receiptName =
          formData.name ||
          (!touchedFields.name ? receiptData.merchant.name : "");

        // Hash the image if imageUri is provided
        let imageHash: string | undefined;
        if (params.imageUri) {
          try {
            imageHash = await hashImage(params.imageUri);
          } catch (error) {
            console.warn("Failed to hash image:", error);
            // Continue saving without hash if hashing fails
          }
        }

        await saveReceipt({
          name: receiptName || receiptData.merchant.name,
          merchant: receiptData.merchant,
          transaction: receiptData.transaction,
          items: receiptData.items,
          totals: receiptData.totals,
          returnInfo: receiptData.returnInfo,
          appData: receiptData.appData,
          technical: receiptData.technical,
          imageUri: params.imageUri,
          imageHash,
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
    [receiptData, touchedFields.name, params.imageUri]
  );

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={handleBackPress}>
          <SymbolView
            name="chevron.left"
            tintColor={
              colorScheme === "dark" ? Colors.dark.text : Colors.light.text
            }
          />
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton
          onPress={handleSubmit(handleSave)}
          disabled={saving || !receiptData}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={
                colorScheme === "dark" ? Colors.dark.text : Colors.light.text
              }
            />
          ) : (
            <SymbolView
              name="checkmark"
              tintColor={
                colorScheme === "dark" ? Colors.dark.text : Colors.light.text
              }
            />
          )}
        </HeaderButton>
      ),
    });
  }, [
    navigation,
    saving,
    receiptData,
    colorScheme,
    handleSave,
    handleSubmit,
    handleBackPress,
  ]);

  // Handle back button with confirmation if form is dirty
  useFocusEffect(
    useCallback(() => {
      const onBeforeRemove = (e: any) => {
        // Allow navigation if we're saving (intentional navigation)
        if (isSavingRef.current) {
          isSavingRef.current = false;
          return;
        }

        // If the form is not dirty, allow the navigation
        if (!isDirty) {
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
                // Remove the listener to allow navigation
                navigation.removeListener("beforeRemove", onBeforeRemove);
                // Dispatch the action to proceed with navigation
                navigation.dispatch(e.data.action);
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
    }, [navigation, isDirty])
  );

  // Handle scanned barcode from barcode scanner
  useFocusEffect(
    useCallback(() => {
      const checkForScannedBarcode = async () => {
        try {
          const storageKey = "@tabbit:scanned_barcode:scannedBarcode";
          const scannedBarcode = await AsyncStorage.getItem(storageKey);

          if (scannedBarcode && receiptData) {
            // Update receipt with scanned barcode
            setReceiptData({
              ...receiptData,
              returnInfo: {
                ...receiptData.returnInfo,
                returnBarcode: scannedBarcode,
                hasReturnBarcode: true,
              },
            });
            // Clear the stored barcode to avoid re-triggering
            await AsyncStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error("Failed to read scanned barcode:", error);
        }
      };

      checkForScannedBarcode();
    }, [receiptData])
  );

  // Store barcodes from API response
  const [apiBarcodes, setApiBarcodes] = useState<Barcode[]>([]);

  // Check if barcode prompt should be shown
  useEffect(() => {
    if (
      receiptData &&
      !loading &&
      !barcodePromptShownRef.current &&
      !params.scannedBarcode
    ) {
      // Parse barcodes from params (from camera.tsx)
      let detectedBarcodesFromParams: Barcode[] = [];
      try {
        if (params.barcodes) {
          detectedBarcodesFromParams = JSON.parse(params.barcodes);
        }
      } catch (e) {
        console.error("Failed to parse barcodes from params:", e);
      }

      // Use barcodes from API response if available, otherwise use params
      const detectedBarcodes =
        apiBarcodes.length > 0 ? apiBarcodes : detectedBarcodesFromParams;

      // Check if LLM detected a return barcode but barcode library didn't detect any
      const hasReturnBarcodeInReceipt =
        receiptData.returnInfo?.hasReturnBarcode === true;
      const hasDetectedBarcodes =
        detectedBarcodes && detectedBarcodes.length > 0;

      // Debug logging
      console.log("[CreateReceipt] Barcode prompt check:", {
        hasReturnBarcodeInReceipt,
        hasDetectedBarcodes,
        detectedBarcodesCount: detectedBarcodes.length,
        apiBarcodesCount: apiBarcodes.length,
        paramsBarcodesCount: detectedBarcodesFromParams.length,
        returnInfo: receiptData.returnInfo,
        barcodesParam: params.barcodes,
      });

      if (hasReturnBarcodeInReceipt && !hasDetectedBarcodes) {
        console.log("[CreateReceipt] Showing barcode scan prompt");
        barcodePromptShownRef.current = true;
        // Show prompt after a short delay to ensure UI is ready
        setTimeout(() => {
          Alert.alert(
            "Barcode Detected",
            "We detected that there's a barcode or QR code on this receipt, but we couldn't read it automatically. Would you like to take a photo of it to scan?",
            [
              {
                text: "No",
                style: "cancel",
              },
              {
                text: "Yes",
                onPress: () => {
                  router.push({
                    pathname: "/barcode-scanner",
                    params: { onScan: "scannedBarcode" },
                  });
                },
              },
            ]
          );
        }, 500);
      } else {
        console.log(
          "[CreateReceipt] Not showing prompt:",
          hasReturnBarcodeInReceipt
            ? "barcodes were detected"
            : "no return barcode in receipt"
        );
      }
    }
  }, [
    receiptData,
    loading,
    params.barcodes,
    params.scannedBarcode,
    apiBarcodes,
  ]);

  useEffect(() => {
    // Load receipt data - check if already scanned in camera screen
    const loadReceiptData = async () => {
      if (!params.imageUri) {
        setError("No image provided. Please take a photo or select an image.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if receipt was already scanned in camera screen
        const storageKey = `@tabbit:scan_result:${params.imageUri}`;
        const storedResult = await AsyncStorage.getItem(storageKey);

        if (storedResult) {
          // Use stored scan result to avoid redundant API call
          try {
            const parsed = JSON.parse(storedResult);
            console.log("[CreateReceipt] Using cached scan result:", {
              hasReturnBarcode: parsed.receipt?.returnInfo?.hasReturnBarcode,
              returnBarcode: parsed.receipt?.returnInfo?.returnBarcode,
              barcodesFromCache: parsed.barcodes,
            });

            if (parsed.receipt) {
              setReceiptData(parsed.receipt);
              if (parsed.barcodes) {
                setApiBarcodes(parsed.barcodes);
              } else {
                setApiBarcodes([]);
              }
              setLoading(false);
              // Clean up stored result
              await AsyncStorage.removeItem(storageKey);
              return;
            }
          } catch (parseError) {
            console.warn("Failed to parse stored scan result:", parseError);
            // Fall through to scan again
          }
        }

        // No cached result - scan receipt using API
        const response = await scanReceipt(params.imageUri);

        if (!response.success) {
          setError(
            response.message ||
              "Failed to scan receipt. Please try again with a clearer image."
          );
          setLoading(false);
          return;
        }

        if (!response.receipt) {
          setError(
            response.message ||
              "No receipt detected in the image. Please ensure the image contains a clear, readable receipt."
          );
          setLoading(false);
          return;
        }

        // Use the receipt data directly from the API response
        console.log("[CreateReceipt] API Response:", {
          success: response.success,
          hasReturnBarcode: response.receipt?.returnInfo?.hasReturnBarcode,
          returnBarcode: response.receipt?.returnInfo?.returnBarcode,
          barcodesFromAPI: response.barcodes,
          barcodesFromParams: params.barcodes,
        });
        setReceiptData(response.receipt);
        // Store barcodes from API response
        if (response.barcodes) {
          setApiBarcodes(response.barcodes);
        } else {
          setApiBarcodes([]);
        }
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again."
        );
        setLoading(false);
        console.error("Error scanning receipt:", err);
      }
    };

    loadReceiptData();
  }, [params.imageUri, params.barcodes]);

  return (
    <View style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Name Input Section */}
          <View style={styles.section}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <FormTextInput
                  label="Receipt Name"
                  placeholder="Enter receipt name..."
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>

          {/* Receipt Data Section */}
          <View style={styles.section}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={
                    colorScheme === "dark"
                      ? Colors.dark.text
                      : Colors.light.text
                  }
                />
                <ThemedText style={styles.loadingText}>
                  Analyzing receipt...
                </ThemedText>
              </View>
            ) : error ? (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 59, 48, 0.1)"
                      : "rgba(255, 59, 48, 0.15)",
                    borderColor: isDark
                      ? "rgba(255, 59, 48, 0.3)"
                      : "rgba(255, 59, 48, 0.4)",
                  },
                ]}
              >
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : receiptData ? (
              <View style={styles.receiptWrapper}>
                <Receipt data={receiptData} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  errorContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    color: "#FF3B30",
  },
  receiptWrapper: {
    width: "100%",
  },
});
