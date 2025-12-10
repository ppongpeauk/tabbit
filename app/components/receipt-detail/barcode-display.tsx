import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import {
  BarcodeCreatorView,
  BarcodeFormat,
} from "react-native-barcode-creator";
import { ThemedText } from "@/components/themed-text";

interface BarcodeDisplayProps {
  value: string;
  format?: string;
}

/**
 * Convert format string from backend (zxing-wasm normalized format) to BarcodeFormat constant
 * Backend formats are normalized from zxing-wasm (e.g., "QRCode" -> "QR_CODE")
 * Maps to react-native-barcode-creator supported formats
 */
function normalizeFormat(format: string): string {
  const formatMap: Record<string, string> = {
    // QR Code variants
    QR: BarcodeFormat.QR,
    QR_CODE: BarcodeFormat.QR,
    MICRO_QR_CODE: BarcodeFormat.QR, // Fallback to QR
    RMQR_CODE: BarcodeFormat.QR, // Fallback to QR

    // Code 128 variants
    CODE128: BarcodeFormat.CODE128,
    CODE_128: BarcodeFormat.CODE128,

    // EAN variants
    EAN13: BarcodeFormat.EAN13,
    EAN_13: BarcodeFormat.EAN13,
    EAN_8: BarcodeFormat.EAN13, // Fallback to EAN13 (library doesn't support EAN-8)

    // UPC variants
    UPCA: BarcodeFormat.UPCA,
    UPC_A: BarcodeFormat.UPCA,
    UPC_E: BarcodeFormat.UPCA, // Fallback to UPC-A

    // PDF417
    PDF417: BarcodeFormat.PDF417,
    PDF_417: BarcodeFormat.PDF417,

    // Aztec
    AZTEC: BarcodeFormat.AZTEC,

    // Unsupported formats - fallback to CODE128
    DATA_MATRIX: BarcodeFormat.CODE128,
    CODE_39: BarcodeFormat.CODE128,
    CODE_93: BarcodeFormat.CODE128,
    ITF: BarcodeFormat.CODE128,
    CODABAR: BarcodeFormat.CODE128,
    DATA_BAR: BarcodeFormat.CODE128,
    DATA_BAR_EXPANDED: BarcodeFormat.CODE128,
    DATA_BAR_LIMITED: BarcodeFormat.CODE128,
    DX_FILM_EDGE: BarcodeFormat.CODE128,
    MAXI_CODE: BarcodeFormat.CODE128,
  };

  return formatMap[format.toUpperCase()] || BarcodeFormat.CODE128;
}

/**
 * Fallback: Detect barcode format from value when format is not provided by backend
 * This should rarely be used since the backend determines the format via zxing-wasm
 * Returns format compatible with react-native-barcode-creator BarcodeFormat
 */
function detectBarcodeFormat(value: string): string {
  // QR codes are typically longer alphanumeric strings
  // Traditional barcodes are usually shorter and numeric
  if (value.length > 20 || /[^0-9]/.test(value)) {
    // Likely QR code or alphanumeric code
    return BarcodeFormat.QR;
  }

  // Numeric barcodes - try Code128 first (most common)
  if (value.length <= 20 && /^[0-9]+$/.test(value)) {
    // Check if it matches EAN-13 (13 digits)
    if (value.length === 13) {
      return BarcodeFormat.EAN13;
    }
    // Check if it matches UPC-A (12 digits)
    if (value.length === 12) {
      return BarcodeFormat.UPCA;
    }
    // Default to Code128 for other numeric codes
    return BarcodeFormat.CODE128;
  }

  // Default to Code128 for alphanumeric codes
  return BarcodeFormat.CODE128;
}

/**
 * BarcodeDisplay component - displays barcode or QR code visually
 */
export function BarcodeDisplay({ value, format }: BarcodeDisplayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Guard clause: don't render if value is empty or invalid
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  // Format is determined by backend via zxing-wasm detection
  // If format is provided, use it; otherwise fallback to detection from value
  const barcodeFormat = format
    ? normalizeFormat(format)
    : detectBarcodeFormat(value);

  const backgroundColor = isDark
    ? Colors.dark.background
    : Colors.light.background;
  const foregroundColor = isDark ? Colors.dark.text : Colors.light.text;

  // For QR codes, use a larger size
  const isQRCode = barcodeFormat === BarcodeFormat.QR;
  const barcodeWidth = isQRCode ? 200 : 280;
  const barcodeHeight = isQRCode ? 200 : 80;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.barcodeWrapper,
          {
            backgroundColor,
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
      >
        <BarcodeCreatorView
          value={value}
          format={barcodeFormat}
          background={backgroundColor}
          foregroundColor={foregroundColor}
          style={{
            alignSelf: "center",
            width: barcodeWidth,
            height: barcodeHeight,
          }}
        />
      </View>
      <ThemedText size="xs" style={styles.barcodeText}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
  barcodeWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  barcode: {
    alignSelf: "center",
  },
  barcodeText: {
    opacity: 0.7,
    textAlign: "center",
    fontFamily: "monospace",
  },
});
