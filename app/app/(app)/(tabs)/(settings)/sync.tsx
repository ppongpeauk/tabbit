/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync settings screen
 */

import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { useSync } from "@/hooks/use-sync";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { SettingsSection } from "@/components/settings/settings-section";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { syncService } from "@/lib/sync-service";
import { presentPaywall } from "@/utils/paywall";

export default function SyncScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { status, enabled, isLoading, sync, push, pull, toggleEnabled } =
    useSync();
  const { isPro } = useRevenueCat();
  const [isChecking, setIsChecking] = useState(false);
  const [syncAllowed, setSyncAllowed] = useState<{
    allowed: boolean;
    reason?: string;
  } | null>(null);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    setIsChecking(true);
    try {
      const result = await syncService.checkSyncStatus();
      setSyncAllowed(result);
    } catch (error) {
      console.error("Failed to check sync status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleEnabled(!enabled);
  };

  const handleSwitchChange = async (newValue: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleEnabled(newValue);
  };

  const handleSyncNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Sync Complete",
        `Synced ${status.pendingCount} receipt(s) successfully.`
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Sync Failed",
        error instanceof Error ? error.message : "Failed to sync receipts"
      );
    }
  };

  const handlePushNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await push();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Push Complete", "Receipts pushed to server successfully.");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Push Failed",
        error instanceof Error ? error.message : "Failed to push receipts"
      );
    }
  };

  const handlePullNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await pull();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pull Complete", "Receipts pulled from server successfully.");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Pull Failed",
        error instanceof Error ? error.message : "Failed to pull receipts"
      );
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading || isChecking) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const canSync = syncAllowed?.allowed ?? false;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <SettingsSection>
          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>Enable Sync</ThemedText>
            <Switch
              value={enabled}
              onValueChange={handleSwitchChange}
              disabled={isLoading}
              trackColor={{
                false: isDark
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(0, 0, 0, 0.2)",
                true: isDark ? "#007AFF" : Colors.light.tint,
              }}
              thumbColor={
                enabled
                  ? "#FFFFFF"
                  : isDark
                    ? "rgba(255, 255, 255, 0.9)"
                    : "#FFFFFF"
              }
              ios_backgroundColor={
                isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)"
              }
            />
          </View>
        </SettingsSection>

        {!isPro && (
          <View
            style={[
              styles.proBanner,
              {
                backgroundColor: isDark
                  ? "rgba(0, 122, 255, 0.15)"
                  : "rgba(0, 122, 255, 0.1)",
              },
            ]}
          >
            <SymbolView
              name="info.circle.fill"
              tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
              size={20}
            />
            <ThemedText
              size="sm"
              style={[
                styles.proBannerText,
                {
                  color: isDark ? Colors.dark.tint : Colors.light.tint,
                },
              ]}
            >
              Free users can sync unlimited receipts, but receipt images are not
              saved. Upgrade to Pro to sync receipt images across devices.
            </ThemedText>
          </View>
        )}

        {isPro && (
          <View
            style={[
              styles.proBanner,
              {
                backgroundColor: isDark
                  ? "rgba(0, 122, 255, 0.15)"
                  : "rgba(0, 122, 255, 0.1)",
              },
            ]}
          >
            <SymbolView
              name="checkmark.circle.fill"
              tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
              size={20}
            />
            <ThemedText
              size="sm"
              style={[
                styles.proBannerText,
                {
                  color: isDark ? Colors.dark.tint : Colors.light.tint,
                },
              ]}
            >
              Pro users can sync unlimited receipts with images saved to the
              cloud.
            </ThemedText>
          </View>
        )}

        {enabled && (
          <>
            <SettingsSection>
              <ThemedText
                size="sm"
                weight="semibold"
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  },
                ]}
              >
                Sync Status
              </ThemedText>
              <View style={styles.statusRow}>
                <ThemedText size="base">Last Sync</ThemedText>
                <ThemedText
                  size="base"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  {formatDate(status.lastSyncAt)}
                </ThemedText>
              </View>
              <View style={styles.statusRow}>
                <ThemedText size="base">Pending</ThemedText>
                <ThemedText
                  size="base"
                  weight="semibold"
                  style={{
                    color:
                      status.pendingCount > 0
                        ? isDark
                          ? Colors.dark.tint
                          : Colors.light.tint
                        : isDark
                          ? Colors.dark.icon
                          : Colors.light.icon,
                  }}
                >
                  {status.pendingCount} receipt(s)
                </ThemedText>
              </View>
              {status.error && (
                <View
                  style={[
                    styles.errorRow,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 59, 48, 0.15)"
                        : "rgba(255, 59, 48, 0.1)",
                    },
                  ]}
                >
                  <ThemedText
                    size="sm"
                    style={[
                      styles.errorText,
                      {
                        color: isDark
                          ? "rgba(255, 59, 48, 0.9)"
                          : "rgba(255, 59, 48, 1)",
                      },
                    ]}
                  >
                    {status.error}
                  </ThemedText>
                </View>
              )}
            </SettingsSection>

            <SettingsSection>
              <ThemedText
                size="sm"
                weight="semibold"
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  },
                ]}
              >
                Manual Sync
              </ThemedText>
              <Button
                variant="primary"
                onPress={handleSyncNow}
                disabled={status.isSyncing}
                loading={status.isSyncing}
                style={styles.button}
              >
                Sync Now
              </Button>
              <View style={styles.buttonRow}>
                <Button
                  variant="secondary"
                  onPress={handlePushNow}
                  disabled={status.isSyncing}
                  style={[styles.button, { flex: 1 }]}
                >
                  Push
                </Button>
                <Button
                  variant="secondary"
                  onPress={handlePullNow}
                  disabled={status.isSyncing}
                  style={[styles.button, { flex: 1 }]}
                >
                  Pull
                </Button>
              </View>
            </SettingsSection>
          </>
        )}
      </ScrollView>
    </ThemedView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  proBannerText: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  errorRow: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {},
  button: {
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  switchLabel: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  errorBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  errorBannerText: {},
});
