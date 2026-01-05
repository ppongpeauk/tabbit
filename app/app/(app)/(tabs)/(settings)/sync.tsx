/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Sync settings screen
 */

import { useState, useEffect } from "react";
import {
  View,
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
import { SettingsSection } from "@/components/settings/settings-section";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { syncService } from "@/lib/sync-service";

export default function SyncScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { status, enabled, isLoading, sync, push, pull, toggleEnabled } =
    useSync();
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
      <ThemedView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const canSync = syncAllowed?.allowed ?? false;

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-10"
      >
        <SettingsSection>
          <View className="flex-row items-center justify-between py-4 px-4">
            <ThemedText className="text-base">Enable Sync</ThemedText>
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


        {enabled && (
          <>
            <SettingsSection>
              <ThemedText
                size="sm"
                weight="semibold"
                className="mb-3 uppercase tracking-widest text-[13px]"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                Sync Status
              </ThemedText>
              <View className="flex-row justify-between items-center py-3">
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
              <View className="flex-row justify-between items-center py-3">
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
                  className="mt-2 p-3 rounded-lg"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255, 59, 48, 0.15)"
                      : "rgba(255, 59, 48, 0.1)",
                  }}
                >
                  <ThemedText
                    size="sm"
                    style={{
                      color: isDark
                        ? "rgba(255, 59, 48, 0.9)"
                        : "rgba(255, 59, 48, 1)",
                    }}
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
                className="mb-3 uppercase tracking-widest text-[13px]"
                style={{
                  color: isDark ? Colors.dark.icon : Colors.light.icon,
                }}
              >
                Manual Sync
              </ThemedText>
              <Button
                variant="primary"
                onPress={handleSyncNow}
                disabled={status.isSyncing}
                loading={status.isSyncing}
                className="mt-3"
              >
                Sync Now
              </Button>
              <View className="flex-row gap-3 mt-3">
                <Button
                  variant="secondary"
                  onPress={handlePushNow}
                  disabled={status.isSyncing}
                  style={{ flex: 1 }}
                >
                  Push
                </Button>
                <Button
                  variant="secondary"
                  onPress={handlePullNow}
                  disabled={status.isSyncing}
                  style={{ flex: 1 }}
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

// Styles removed in favor of Tailwind CSS (NativeWind)

