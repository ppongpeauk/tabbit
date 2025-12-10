/**
 * @author Composer
 * @description Bottom sheet for sharing group with QR code and invite link
 */

import { useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, Share } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  BarcodeCreatorView,
  BarcodeFormat,
} from "react-native-barcode-creator";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { Group } from "@/utils/api";
import type React from "react";

interface ShareBottomSheetProps {
  group: Group | null;
  bottomSheetRef: React.RefObject<React.ComponentRef<
    typeof BottomSheetModal
  > | null>;
}

export function ShareBottomSheet({
  group,
  bottomSheetRef,
}: ShareBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const snapPoints = useMemo(() => ["75%"], []);

  const inviteLink = useMemo(() => {
    if (!group) return "";
    return group.code;
  }, [group]);

  const inviteMessage = useMemo(() => {
    if (!group) return "";
    return `Join my group "${group.name}" on Recipio!\n\nGroup code: ${group.code}`;
  }, [group]);

  const handleCopyLink = useCallback(async () => {
    if (!group) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: inviteLink,
        title: "Group Code",
      });
    } catch (error) {
      console.error("Failed to share link:", error);
    }
  }, [group, inviteLink]);

  const handleShare = useCallback(async () => {
    if (!group) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: inviteMessage,
      title: `Join ${group.name}`,
    });
  }, [group, inviteMessage]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        animatedIndex={props.animatedIndex}
        animatedPosition={props.animatedPosition}
        style={props.style}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  if (!group) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{
        backgroundColor: isDark
          ? Colors.dark.background
          : Colors.light.background,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(0, 0, 0, 0.3)",
      }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.qrContainer}>
          <View
            style={[
              styles.qrWrapper,
              {
                backgroundColor: "white",
                borderColor: isDark ? "white" : "black",
                borderWidth: 4,
              },
            ]}
          >
            <BarcodeCreatorView
              value={group.code}
              format={BarcodeFormat.QR}
              background="white"
              foregroundColor="black"
              style={styles.qrCode}
            />
          </View>
          <ThemedText
            size="base"
            style={[
              styles.qrLabel,
              {
                color: isDark ? Colors.dark.icon : Colors.light.icon,
              },
            ]}
          >
            Scan to join
          </ThemedText>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={handleCopyLink}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <SymbolView
                name="link"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={24}
              />
            </View>
            <ThemedText size="sm" weight="semibold" style={styles.actionLabel}>
              Copy Link
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.1)",
                },
              ]}
            >
              <SymbolView
                name="square.and.arrow.up"
                tintColor={isDark ? Colors.dark.text : Colors.light.text}
                size={24}
              />
            </View>
            <ThemedText size="sm" weight="semibold" style={styles.actionLabel}>
              Share
            </ThemedText>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrLabel: {
    opacity: 0.7,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 16,
    minWidth: 120,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    textAlign: "center",
  },
});
