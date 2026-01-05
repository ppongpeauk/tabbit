import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useLimits } from "@/hooks/use-limits";
import type React from "react";
import { Button } from "./button";

interface LimitsModalProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
}

export function LimitsModal({ bottomSheetRef }: LimitsModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { limitStatus } = useLimits();

  const handleUpgrade = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Upgrade functionality removed
  }, []);

  const scansRemaining = limitStatus?.monthlyScansRemaining ?? 0;
  const scansLimit = limitStatus?.monthlyScansLimit ?? 0;
  const receiptsRemaining = limitStatus?.totalReceiptsRemaining ?? 0;
  const receiptsLimit = limitStatus?.totalReceiptsLimit ?? 0;
  const limitsDisabled = limitStatus?.limitsDisabled ?? false;

  return (
    <TrueSheet
      ref={bottomSheetRef}
      // sizes={["75%"]}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      cornerRadius={24}
    >
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <ThemedText size="xl" weight="bold">
            Free Plan Limits
          </ThemedText>
        </View>

        {limitsDisabled ? (
          <View
            style={[
              styles.limitCard,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <ThemedText
              size="base"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              Limits are currently disabled on the server. You have unlimited
              access to all features.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.limitsContainer}>
            <View
              style={[
                styles.limitCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <View style={styles.limitHeader}>
                <SymbolView
                  name="camera.fill"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  size={24}
                />
                <ThemedText
                  size="lg"
                  weight="semibold"
                  style={styles.limitTitle}
                >
                  Monthly Scans
                </ThemedText>
              </View>
              <ThemedText
                size="base"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                  marginTop: 8,
                }}
              >
                {scansRemaining} of {scansLimit} scans remaining this month
              </ThemedText>
              {scansRemaining === 0 && (
                <ThemedText
                  size="sm"
                  style={{
                    color: "#FF3B30",
                    marginTop: 4,
                  }}
                >
                  Limit reached
                </ThemedText>
              )}
            </View>

            <View
              style={[
                styles.limitCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <View style={styles.limitHeader}>
                <SymbolView
                  name="doc.text.fill"
                  tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                  size={24}
                />
                <ThemedText
                  size="lg"
                  weight="semibold"
                  style={styles.limitTitle}
                >
                  Synced Receipts
                </ThemedText>
              </View>
              <ThemedText
                size="base"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                  marginTop: 8,
                }}
              >
                {receiptsRemaining} of {receiptsLimit} receipts can be synced
              </ThemedText>
              {receiptsRemaining === 0 && (
                <ThemedText
                  size="sm"
                  style={{
                    color: "#FF3B30",
                    marginTop: 4,
                  }}
                >
                  Limit reached
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {!limitsDisabled && (
          <>
            <View
              style={[
                styles.proSection,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <ThemedText size="lg" weight="bold" style={styles.proTitle}>
                Upgrade to Tabbit Pro
              </ThemedText>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <SymbolView
                    name="checkmark.circle.fill"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    size={20}
                  />
                  <ThemedText size="base" style={styles.benefitText}>
                    Unlimited scans
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <SymbolView
                    name="checkmark.circle.fill"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    size={20}
                  />
                  <ThemedText size="base" style={styles.benefitText}>
                    Unlimited synced receipts
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <SymbolView
                    name="checkmark.circle.fill"
                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                    size={20}
                  />
                  <ThemedText size="base" style={styles.benefitText}>
                    Sync across all your devices
                  </ThemedText>
                </View>
              </View>
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleUpgrade}
              style={styles.upgradeButton}
              disabled
            >
              Upgrade unavailable
            </Button>
          </>
        )}
      </View>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 24,
  },
  limitsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  limitCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  limitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  limitTitle: {
    flex: 1,
  },
  proSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  proTitle: {
    marginBottom: 12,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    flex: 1,
  },
  upgradeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
