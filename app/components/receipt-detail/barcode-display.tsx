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
 * Convert format string to BarcodeFormat constant
 */
function normalizeFormat(format: string): string {
  const formatMap: Record<string, string> = {
    QR: BarcodeFormat.QR,
    QR_CODE: BarcodeFormat.QR,
    CODE128: BarcodeFormat.CODE128,
    CODE_128: BarcodeFormat.CODE128,
    EAN13: BarcodeFormat.EAN13,
    EAN_13: BarcodeFormat.EAN13,
    UPCA: BarcodeFormat.UPCA,
    UPC_A: BarcodeFormat.UPCA,
    PDF417: BarcodeFormat.PDF417,
    PDF_417: BarcodeFormat.PDF417,
    AZTEC: BarcodeFormat.AZTEC,
  };

  return formatMap[format.toUpperCase()] || format;
}

/**
 * Detect barcode format from value
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
  const barcodeFormat = format
    ? normalizeFormat(format)
    : detectBarcodeFormat(value);

  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
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
          style={[
            styles.barcode,
            {
              width: barcodeWidth,
              height: barcodeHeight,
            },
          ]}
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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

