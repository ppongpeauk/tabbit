/**
 * @author Composer
 * @description Bottom sheet for sharing friend QR code and native share options
 */

import { useCallback, useMemo, useState, useEffect } from "react";
import { View, TouchableOpacity, Share, ActivityIndicator, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import {
  BarcodeCreatorView,
  BarcodeFormat,
} from "react-native-barcode-creator";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/button";
import type React from "react";
import { generateFriendToken } from "@/utils/api";
import { router } from "expo-router";
import { WEB_BASE_URL } from "@/utils/config";

interface FriendShareBottomSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
}

export function FriendShareBottomSheet({
  bottomSheetRef,
}: FriendShareBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await generateFriendToken();
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setError(result.message || "Failed to generate friend token");
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const shareUrl = useMemo(() => {
    if (!token) return "";
    // Share web URL that will redirect to app
    return `${WEB_BASE_URL}/add-friend?token=${encodeURIComponent(token)}`;
  }, [token]);

  const shareMessage = useMemo(() => {
    if (!token) return "";
    return `Add me as a friend on Tabbit!\n\n${shareUrl}`;
  }, [token, shareUrl]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleShare = useCallback(async () => {
    if (!token) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        url: shareUrl,
        message: shareMessage,
        title: "Add me as a friend",
      });
    } catch (error) {
      console.error("Failed to share friend request:", error);
    }
  }, [token, shareUrl, shareMessage]);

  const handleScanFriend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.dismiss();
    router.push("/camera?onScan=friend");
  }, [bottomSheetRef]);

  if (loading) {
    return (
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          <ActivityIndicator
            size="large"
            color={isDark ? Colors.dark.tint : Colors.light.tint}
          />
          <ThemedText size="base" className="mt-4 opacity-70">
            Generating QR code...
          </ThemedText>
        </View>
      </TrueSheet>
    );
  }

  if (error || !token) {
    return (
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
      >
        <View className="flex-1 px-6 pt-8 pb-10">
          <View className="flex-row justify-between items-center mb-8">
            <ThemedText size="xl" weight="bold">
              Add Friend
            </ThemedText>
            <TouchableOpacity
              onPress={handleClose}
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
          <View className="flex-1 items-center justify-center">
            <ThemedText size="base" className="text-center mb-4">
              {error || "Failed to generate friend token"}
            </ThemedText>
            <Button onPress={loadToken} variant="primary">
              Try Again
            </Button>
          </View>
        </View>
      </TrueSheet>
    );
  }

  return (
    <TrueSheet
      ref={bottomSheetRef}
      backgroundColor={
        isDark ? Colors.dark.background : Colors.light.background
      }
      detents={['auto']}
    >
      <View className="flex-1 px-6 pt-8">
        {/* Header with close button */}
        <View className="flex-row justify-between items-center mb-8">
          <ThemedText size="xl" weight="bold">
            Add Friend
          </ThemedText>
          <TouchableOpacity
            onPress={handleClose}
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

        {/* QR Code Section */}
        <View className="items-center mb-8">
          <View
            className="p-5 rounded-3xl items-center justify-center mb-4"
            style={{
              backgroundColor: "white",
              borderColor: isDark ? "white" : "black",
              borderWidth: 4,
            }}
          >
            <BarcodeCreatorView
              value={shareUrl}
              format={BarcodeFormat.QR}
              background="white"
              foregroundColor="black"
              style={{ width: 200, height: 200 }}
            />
          </View>
          <ThemedText
            size="base"
            className="text-center text-neutral-500 dark:text-neutral-400"
            style={{
              color: isDark ? Colors.dark.icon : Colors.light.icon,
            }}
          >
            Show this QR code to your friends to add you.
          </ThemedText>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          <Button
            variant="secondary"
            onPress={handleScanFriend}
            leftIcon={<SymbolView name="qrcode.viewfinder" />}
            fullWidth
          >
            Scan Friend&apos;s QR Code
          </Button>

          <Button
            variant="secondary"
            onPress={handleShare}
            leftIcon={<SymbolView name="square.and.arrow.up" />}
            fullWidth
          >
            Share
          </Button>
        </View>
      </View>
    </TrueSheet>
  );
}
