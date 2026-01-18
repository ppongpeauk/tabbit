/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description General settings screen with default split mode configuration
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import {
  SettingsSection,
  SettingsItem,
} from "@/components/settings";
import { SplitModeChoices } from "@/components/split/split-mode-choices";
import { SplitStrategy } from "@/utils/split";
import { getDefaultSplitMode, setDefaultSplitMode } from "@/utils/storage";
import { getSplitModeLabel } from "@/utils/split-constants";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type React from "react";

export default function GeneralScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedMode, setSelectedMode] = useState<SplitStrategy>(
    SplitStrategy.EQUAL
  );
  const [loading, setLoading] = useState(true);
  const [tempSelectedMode, setTempSelectedMode] = useState<SplitStrategy>(
    SplitStrategy.EQUAL
  );
  const bottomSheetRef = useRef<TrueSheet | null>(null);

  useEffect(() => {
    loadDefaultSplitMode();
  }, []);

  const loadDefaultSplitMode = useCallback(async () => {
    try {
      setLoading(true);
      const defaultMode = await getDefaultSplitMode();
      setSelectedMode(defaultMode);
      setTempSelectedMode(defaultMode);
    } catch (error) {
      console.error("Error loading default split mode:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempSelectedMode(selectedMode);
    bottomSheetRef.current?.present();
  }, [selectedMode]);

  const handleCloseModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleModeSelect = useCallback((mode: SplitStrategy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempSelectedMode(mode);
  }, []);

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setDefaultSplitMode(tempSelectedMode);
      setSelectedMode(tempSelectedMode);
      bottomSheetRef.current?.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error saving default split mode:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [tempSelectedMode]);

  return (
    <>
      <ThemedView className="flex-1">
        <ScrollView
          contentContainerClassName="px-5 pt-5 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection>
            <SettingsItem
              label="Default Split Mode"
              value={getSplitModeLabel(selectedMode)}
              showChevron
              onPress={handleOpenModal}
            />
          </SettingsSection>
        </ScrollView>
      </ThemedView>

      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={[1]}
      >
        <View
          className="px-6 py-8"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center">
            <ThemedText size="xl" weight="bold">
              Default Split Mode
            </ThemedText>
            <TouchableOpacity
              onPress={handleCloseModal}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SymbolView
                name="xmark.circle.fill"
                tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
                size={28}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="gap-4">
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              }}
            >
              Choose the default split mode that will be pre-selected when
              splitting a receipt.
            </ThemedText>
            <SplitModeChoices
              selectedStrategy={tempSelectedMode}
              onSelect={handleModeSelect}
            />
          </View>

          {/* Footer Buttons */}
          <View className="flex-row gap-3 mt-6">
            <Button
              variant="secondary"
              onPress={handleCloseModal}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              style={{ flex: 1 }}
            >
              Save
            </Button>
          </View>
        </View>
      </TrueSheet>
    </>
  );
}
