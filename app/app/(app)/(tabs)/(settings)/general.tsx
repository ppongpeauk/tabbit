/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description General settings screen with default split mode configuration
 */

import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Modal } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import {
  SettingsSection,
  SettingsItem,
  SettingsModalHeader,
  SettingsModalFooter,
} from "@/components/settings";
import { SplitModeChoices } from "@/components/split/split-mode-choices";
import { SplitStrategy } from "@/utils/split";
import { getDefaultSplitMode, setDefaultSplitMode } from "@/utils/storage";
import { getSplitModeLabel } from "@/utils/split-constants";
import * as Haptics from "expo-haptics";

export default function GeneralScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedMode, setSelectedMode] = useState<SplitStrategy>(
    SplitStrategy.EQUAL
  );
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tempSelectedMode, setTempSelectedMode] = useState<SplitStrategy>(
    SplitStrategy.EQUAL
  );

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
    setShowModal(true);
  }, [selectedMode]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
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
      setShowModal(false);
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

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <ThemedView className="flex-1">
          <SettingsModalHeader
            title="Default Split Mode"
            onClose={handleCloseModal}
          />
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-6 pb-5"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText
              size="sm"
              style={{
                color: isDark ? Colors.dark.icon : Colors.light.icon,
                marginBottom: 16,
              }}
            >
              Choose the default split mode that will be pre-selected when
              splitting a receipt.
            </ThemedText>
            <SplitModeChoices
              selectedStrategy={tempSelectedMode}
              onSelect={handleModeSelect}
            />
          </ScrollView>
          <SettingsModalFooter>
            <Button
              variant="secondary"
              onPress={handleCloseModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              className="flex-1"
            >
              Save
            </Button>
          </SettingsModalFooter>
        </ThemedView>
      </Modal>
    </>
  );
}
