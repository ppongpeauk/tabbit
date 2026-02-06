/**
 * @description Bottom sheet for viewing receipt photos with pan and zoom
 */

import { useState, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { getReceiptPhotoUrl } from "@/utils/storage";
import type React from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

interface ReceiptPhotoSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  onClose: () => void;
}

export function ReceiptPhotoSheet({
  bottomSheetRef,
  receiptId,
  onClose,
}: ReceiptPhotoSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoom and pan state
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);

  const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;

  // Load image when sheet opens
  const loadPhoto = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = await getReceiptPhotoUrl(receiptId);
      console.log("url", url);
      setImageUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load receipt photo";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    onClose();
  }, [bottomSheetRef, onClose]);

  // Reset transform when sheet closes
  const handleSheetDismiss = useCallback(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [scale, translateX, translateY]);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = startScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = startTranslateX.value + event.translationX;
        translateY.value = startTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <TrueSheet
      ref={bottomSheetRef}
      detents={[1]}
      backgroundColor={backgroundColor}
      onDidDismiss={handleSheetDismiss}
      onDidPresent={loadPhoto}
    >
      <GestureDetector gesture={composedGesture}>
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <ThemedText size="xl" weight="bold">
              Receipt Photo
            </ThemedText>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SymbolView
                name="xmark.circle.fill"
                tintColor={iconColor}
                size={28}
              />
            </TouchableOpacity>
          </View>

          {/* Image Container */}
          <View className="flex-1 min-h-[400px] items-center justify-center bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden mb-4">
            {isLoading ? (
              <ActivityIndicator size="large" />
            ) : error ? (
              <View className="items-center gap-2">
                <SymbolView
                  name="photo.badge.exclamationmark"
                  tintColor={iconColor}
                  size={48}
                />
                <ThemedText style={{ color: iconColor }}>Failed to load photo</ThemedText>
              </View>
            ) : imageUrl ? (
              <Animated.Image
                source={{ uri: imageUrl }}
                style={[
                  { width: "100%", height: "100%" },
                  imageStyle,
                ]}
                resizeMode="contain"
                onError={() => setError("Failed to load image")}
              />
            ) : null}
          </View>

          {/* Instructions */}
          <View className="items-center">
            <ThemedText
              size="sm"
              style={{ color: isDark ? Colors.dark.subtle : Colors.light.icon }}
            >
              Pinch to zoom • Drag to pan • Double-tap to reset
            </ThemedText>
          </View>
        </View>
      </GestureDetector>
    </TrueSheet>
  );
}
