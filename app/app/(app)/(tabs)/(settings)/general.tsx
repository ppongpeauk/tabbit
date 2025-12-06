/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description General settings screen with default split mode configuration
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { RadioButton } from "@/components/ui/radio-button";
import { Button } from "@/components/button";
import {
  SettingsSection,
  SettingsItem,
  SettingsModalHeader,
  SettingsModalFooter,
} from "@/components/settings";
import { SplitStrategy } from "@/utils/split";
import { getDefaultSplitMode, setDefaultSplitMode } from "@/utils/storage";
import * as Haptics from "expo-haptics";

const SPLIT_MODE_OPTIONS = [
  {
    value: SplitStrategy.EQUAL,
    label: "Even",
    icon: "equal.circle",
    description:
      "Split the total amount equally among all selected people. Perfect for shared meals or group expenses.",
  },
  {
    value: SplitStrategy.ITEMIZED,
    label: "Itemized",
    icon: "list.bullet",
    description:
      "Assign specific items from the receipt to each person. Great when people ordered different things.",
  },
  {
    value: SplitStrategy.PERCENTAGE,
    label: "Percentage",
    icon: "percent",
    description:
      "Split by percentage of the total. Each person pays a specific percentage of the bill.",
  },
  {
    value: SplitStrategy.CUSTOM,
    label: "Custom",
    icon: "slider.horizontal.3",
    description:
      "Manually set custom amounts for each person. Use this for complex splits or specific arrangements.",
  },
];

const getSplitModeLabel = (mode: SplitStrategy): string => {
  const option = SPLIT_MODE_OPTIONS.find((opt) => opt.value === mode);
  return option?.label || "Even";
};

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
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
        <ThemedView style={styles.modalContainer}>
          <SettingsModalHeader
            title="Default Split Mode"
            onClose={handleCloseModal}
          />
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
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
            <View style={styles.optionsContainer}>
              {SPLIT_MODE_OPTIONS.map((option) => (
                <RadioButton
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  icon={option.icon}
                  description={option.description}
                  isSelected={tempSelectedMode === option.value}
                  onPress={() => handleModeSelect(option.value)}
                />
              ))}
            </View>
          </ScrollView>
          <SettingsModalFooter>
            <Button
              variant="secondary"
              onPress={handleCloseModal}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              style={styles.modalButton}
            >
              Save
            </Button>
          </SettingsModalFooter>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

