/**
 * @author Composer
 * @description Bottom sheet for sharing receipts with friends and native share options
 */

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Share, Pressable, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { EmptyState } from "@/components/empty-state";
import type React from "react";
import { WEB_BASE_URL, AnimationConfig } from "@/utils/config";
import { useFriends } from "@/hooks/use-friends";
import { getFriends as getFriendsFromApi, shareReceipt } from "@/utils/api";
import type { Friend } from "@/utils/storage";
import { Alert } from "react-native";

interface ShareReceiptBottomSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  receiptName?: string;
}

interface FriendSection {
  title: string;
  data: Friend[];
}

const RECENT_FRIENDS_KEY = (receiptId: string) =>
  `@tabbit:recent_friends:${receiptId}`;

interface FriendGridItemProps {
  friend: Friend;
  isSelected: boolean;
  isDark: boolean;
  onPress: (friend: Friend) => void;
}

function FriendGridItem({
  friend,
  isSelected,
  isDark,
  onPress,
}: FriendGridItemProps) {
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(isSelected ? 1 : 0, {
      duration: AnimationConfig.fast,
    });
  }, [isSelected, selectionProgress]);

  const avatarBgAnimatedStyle = useAnimatedStyle(() => {
    const unselectedBg = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
    const selectedBg = isDark ? "#22c55e" : "#16a34a";

    return {
      backgroundColor: interpolateColor(
        selectionProgress.value,
        [0, 1],
        [unselectedBg, selectedBg]
      ),
    };
  });

  const borderAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderWidth: selectionProgress.value * 3,
      borderColor: isDark ? Colors.dark.background : Colors.light.background,
    };
  });

  const checkmarkOverlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: selectionProgress.value,
      transform: [{ scale: selectionProgress.value }],
    };
  });

  const initialAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - selectionProgress.value,
      transform: [{ scale: 1 - selectionProgress.value * 0.3 }],
    };
  });

  return (
    <Pressable
      onPress={() => onPress(friend)}
      className="items-center flex-1 max-w-[33.33%] mb-4"
      style={{ minWidth: "33.33%" }}
    >
      <Animated.View
        className="w-20 h-20 rounded-full items-center justify-center mb-2"
        style={[avatarBgAnimatedStyle, borderAnimatedStyle]}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            },
            initialAnimatedStyle,
          ]}
        >
          <ThemedText size="lg" weight="semibold">
            {friend.name?.charAt(0).toUpperCase() || "?"}
          </ThemedText>
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            },
            checkmarkOverlayAnimatedStyle,
          ]}
        >
          <SymbolView
            name="checkmark"
            tintColor="white"
            size={24}
          />
        </Animated.View>
      </Animated.View>
      <ThemedText
        size="xs"
        weight="normal"
        className="text-center px-1"
        numberOfLines={1}
      >
        {friend.name || "Unknown"}
      </ThemedText>
    </Pressable>
  );
}

export function ShareReceiptBottomSheet({
  bottomSheetRef,
  receiptId,
  receiptName,
}: ShareReceiptBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: allFriends = [] } = useFriends();
  const [platformFriendIds, setPlatformFriendIds] = useState<Set<string>>(
    new Set()
  );
  const [recentFriendIds, setRecentFriendIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    new Set()
  );
  const qrCodeSheetRef = useRef<TrueSheet | null>(null);

  useEffect(() => {
    const loadPlatformFriends = async () => {
      try {
        const apiResponse = await getFriendsFromApi();
        if (apiResponse.success && apiResponse.friends) {
          const ids = new Set(apiResponse.friends.map((f) => f.friendId));
          setPlatformFriendIds(ids);
        }
      } catch (error) {
        console.error("Failed to load platform friends:", error);
      }
    };
    loadPlatformFriends();
  }, []);

  const friends = useMemo(() => {
    return allFriends.filter((friend) => platformFriendIds.has(friend.id));
  }, [allFriends, platformFriendIds]);
  useEffect(() => {
    const loadRecentFriends = async () => {
      try {
        const key = RECENT_FRIENDS_KEY(receiptId);
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setRecentFriendIds(new Set(ids));
        }
      } catch (error) {
        console.error("Failed to load recent friends:", error);
      }
    };
    loadRecentFriends();
  }, [receiptId]);

  const shareUrl = useMemo(() => {
    return `${WEB_BASE_URL}/receipts/${receiptId}`;
  }, [receiptId]);

  const shareMessage = useMemo(() => {
    const name = receiptName ? `"${receiptName}"` : "this receipt";
    return `Check out ${name} on Tabbit!\n\n${shareUrl}`;
  }, [receiptName, shareUrl]);

  const sections = useMemo<FriendSection[]>(() => {
    const recentFriends: Friend[] = [];
    const allFriends: Friend[] = [];

    friends.forEach((friend) => {
      if (recentFriendIds.has(friend.id)) {
        recentFriends.push(friend);
      } else {
        allFriends.push(friend);
      }
    });

    const sections: FriendSection[] = [];
    if (recentFriends.length > 0) {
      sections.push({ title: "Recents", data: recentFriends });
    }
    if (allFriends.length > 0) {
      sections.push({ title: "All Friends", data: allFriends });
    }

    return sections;
  }, [friends, recentFriendIds]);

  const chunkArray = useCallback((array: Friend[], size: number) => {
    const chunks: Friend[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFriendIds(new Set());
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleShare = useCallback(async () => {
    if (!receiptId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        url: shareUrl,
        title: receiptName || "Share Receipt",
        message: shareMessage,
      });
    } catch (error) {
      console.error("Failed to share receipt:", error);
    }
  }, [receiptId, shareUrl, shareMessage, receiptName]);

  const handleShowQRCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    qrCodeSheetRef.current?.present();
  }, []);

  const handleFriendPress = useCallback(
    (friend: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedFriendIds((prev) => {
        const updated = new Set(prev);
        if (updated.has(friend.id)) {
          updated.delete(friend.id);
        } else {
          updated.add(friend.id);
        }
        return updated;
      });
    },
    []
  );

  const handleShareToPeople = useCallback(async () => {
    if (selectedFriendIds.size === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Share receipt with selected friends via API
      const friendIdsArray = Array.from(selectedFriendIds);
      const shareResult = await shareReceipt(receiptId, friendIdsArray);

      if (!shareResult.success) {
        Alert.alert(
          "Error",
          shareResult.message || "Failed to share receipt with friends"
        );
        return;
      }

      // Save to recent friends
      const key = RECENT_FRIENDS_KEY(receiptId);
      const updatedIds = new Set(recentFriendIds);
      selectedFriendIds.forEach((id) => updatedIds.add(id));
      setRecentFriendIds(updatedIds);

      await AsyncStorage.setItem(
        key,
        JSON.stringify(Array.from(updatedIds))
      );

      setSelectedFriendIds(new Set());
      bottomSheetRef.current?.dismiss();
    } catch (error) {
      console.error("Failed to share with friends:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to share receipt with friends"
      );
    }
  }, [receiptId, recentFriendIds, selectedFriendIds, shareUrl, shareMessage, receiptName, bottomSheetRef]);

  const renderSectionHeader = useCallback((title: string) => {
    return (
      <View className="px-6 pt-6 pb-3">
        <ThemedText
          size="sm"
          weight="semibold"
          className="uppercase tracking-wider opacity-60"
        >
          {title}
        </ThemedText>
      </View>
    );
  }, []);

  const renderFriendGridItem = useCallback(
    (friend: Friend) => {
      const isSelected = selectedFriendIds.has(friend.id);
      return (
        <FriendGridItem
          key={friend.id}
          friend={friend}
          isSelected={isSelected}
          isDark={isDark}
          onPress={handleFriendPress}
        />
      );
    },
    [handleFriendPress, selectedFriendIds, isDark]
  );

  const renderGridRow = useCallback(
    (row: Friend[], rowIndex: number) => {
      return (
        <View key={rowIndex} className="flex-row px-6">
          {row.map((friend) => renderFriendGridItem(friend))}
          {row.length < 3 &&
            Array.from({ length: 3 - row.length }).map((_, index) => (
              <View key={`empty-${index}`} className="flex-1" />
            ))}
        </View>
      );
    },
    [renderFriendGridItem]
  );

  const renderFooter = useCallback(() => {
    const hasSelectedFriends = selectedFriendIds.size > 0;

    return (
      <View className="px-6 pt-4 pb-6 border-t border-black/10 dark:border-white/10">
        {hasSelectedFriends ? (
          <Button
            variant="secondary"
            size="base"
            onPress={handleShareToPeople}
            fullWidth
            leftIcon={
              <SymbolView
                name="square.and.arrow.up"
              />
            }
          >
            Share to All
          </Button>
        ) : (
          <View className="flex-row gap-3 justify-center w-full">
            <Button
              variant="secondary"
              onPress={handleShare}
              className="flex-1"
              leftIcon={
                <SymbolView
                  name="square.and.arrow.up"
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                  size={20}
                />
              }
            >
              Share
            </Button>
            <Button
              variant="secondary"
              onPress={handleShowQRCode}
              className="flex-1"
              leftIcon={
                <SymbolView
                  name="qrcode"
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                  size={20}
                />
              }
            >
              QR Code
            </Button>
          </View>
        )}
      </View>
    );
  }, [handleShare, handleShowQRCode, handleShareToPeople, selectedFriendIds.size, isDark]);

  const handleCloseQRCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    qrCodeSheetRef.current?.dismiss();
  }, []);

  if (!receiptId) return null;

  return (
    <>
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
        detents={['auto']}
        scrollable
        footer={renderFooter()}
      >
        <View className="flex-1">
          <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
            <ThemedText size="xl" weight="bold">
              Share Receipt
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

          {friends.length === 0 ? (
            <EmptyState
              icon="person.2.fill"
              title="No friends yet"
              subtitle="Add friends to share receipts with them directly."
              style={{ paddingBottom: 140 }}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
            >
              {sections.map((section) => (
                <View key={section.title}>
                  {renderSectionHeader(section.title)}
                  {chunkArray(section.data, 3).map((row, rowIndex) =>
                    renderGridRow(row, rowIndex)
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </TrueSheet>

      <TrueSheet
        ref={qrCodeSheetRef}
        backgroundColor={isDark ? Colors.dark.background : Colors.light.background}
        detents={['auto']}
      >
        <View className="flex-1 px-6 pt-8 pb-6">
          <View className="flex-row justify-between items-center mb-8">
            <ThemedText size="xl" weight="bold">
              QR Code
            </ThemedText>
            <TouchableOpacity
              onPress={handleCloseQRCode}
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

          <View className="items-center">
            <View className="p-5 rounded-3xl items-center justify-center mb-4 bg-white border-4 border-black dark:border-white">
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
              className="text-center text-[#687076] dark:text-[#9BA1A6]"
            >
              Show this QR code to your friends.
            </ThemedText>
          </View>
        </View>
      </TrueSheet>
    </>
  );
}
