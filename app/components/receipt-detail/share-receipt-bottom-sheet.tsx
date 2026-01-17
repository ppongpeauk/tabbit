/**
 * @author Composer
 * @description Bottom sheet for sharing receipts with friends and native share options
 */

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Share, Pressable, Image } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { FlashList } from "@shopify/flash-list";
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
import type React from "react";
import { WEB_BASE_URL } from "@/utils/config";
import { useFriends } from "@/hooks/use-friends";
import type { Friend } from "@/utils/api";

interface ShareReceiptBottomSheetProps {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  receiptId: string;
  receiptName?: string;
}

interface FriendSection {
  title: string;
  data: Friend[];
}

type FlashListItem = string | Friend;

const RECENT_FRIENDS_KEY = (receiptId: string) =>
  `@tabbit:recent_friends:${receiptId}`;

export function ShareReceiptBottomSheet({
  bottomSheetRef,
  receiptId,
  receiptName,
}: ShareReceiptBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: friends = [] } = useFriends();
  const [recentFriendIds, setRecentFriendIds] = useState<Set<string>>(
    new Set()
  );
  const qrCodeSheetRef = useRef<TrueSheet | null>(null);

  // Load recent friends for this receipt
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

  // Split friends into recents and all
  const sections = useMemo<FriendSection[]>(() => {
    const recentFriends: Friend[] = [];
    const allFriends: Friend[] = [];

    friends.forEach((friend) => {
      if (recentFriendIds.has(friend.friendId)) {
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
      sections.push({ title: "All", data: allFriends });
    }

    return sections;
  }, [friends, recentFriendIds]);

  // Convert sections to flat array for FlashList
  const flashListData = useMemo<FlashListItem[]>(() => {
    const flatData: FlashListItem[] = [];
    sections.forEach((section) => {
      flatData.push(section.title);
      flatData.push(...section.data);
    });
    return flatData;
  }, [sections]);

  // Calculate sticky header indices
  const stickyHeaderIndices = useMemo<number[]>(() => {
    return flashListData
      .map((item, index) => {
        if (typeof item === "string") {
          return index;
        }
        return null;
      })
      .filter((item): item is number => item !== null);
  }, [flashListData]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    async (friend: Friend) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        // Add to recent friends
        const key = RECENT_FRIENDS_KEY(receiptId);
        const updatedIds = new Set(recentFriendIds);
        updatedIds.add(friend.friendId);
        setRecentFriendIds(updatedIds);

        // Store in AsyncStorage
        await AsyncStorage.setItem(
          key,
          JSON.stringify(Array.from(updatedIds))
        );

        // Share the receipt URL
        await Share.share({
          url: shareUrl,
          title: receiptName || "Share Receipt",
          message: shareMessage,
        });
      } catch (error) {
        console.error("Failed to share with friend:", error);
      }
    },
    [receiptId, recentFriendIds, shareUrl, shareMessage, receiptName]
  );

  const renderSectionHeader = useCallback((title: string) => {
    return (
      <View className="px-6 pt-4 pb-2">
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

  const renderFriendItem = useCallback(
    (item: Friend, index: number) => {
      const isFirstInSection = index === 0 || typeof flashListData[index - 1] === "string";
      const separatorColor = isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";
      const rowBaseBg = isDark ? Colors.dark.surface : Colors.light.surface;
      const pressedBg = isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.03)";

      return (
        <View>
          {!isFirstInSection && (
            <View
              className="h-[1px] mx-6"
              style={{ backgroundColor: separatorColor }}
            />
          )}
          <Pressable
            onPress={() => handleFriendPress(item)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: pressed ? pressedBg : rowBaseBg,
            })}
          >
            {item.friendImage ? (
              <Image
                source={{ uri: item.friendImage }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.05)",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                }}
              >
                <ThemedText size="base" weight="semibold">
                  {item.friendName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View className="flex-1 ml-3">
              <ThemedText size="base" weight="semibold">
                {item.friendName}
              </ThemedText>
              {item.friendEmail && (
                <ThemedText
                  size="sm"
                  style={{
                    color: isDark ? Colors.dark.icon : Colors.light.icon,
                  }}
                >
                  {item.friendEmail}
                </ThemedText>
              )}
            </View>
            <SymbolView
              name="chevron.right"
              tintColor={isDark ? Colors.dark.icon : Colors.light.icon}
              size={16}
            />
          </Pressable>
        </View>
      );
    },
    [isDark, flashListData, handleFriendPress]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FlashListItem; index: number }) => {
      if (typeof item === "string") {
        return renderSectionHeader(item);
      }
      return renderFriendItem(item, index);
    },
    [renderSectionHeader, renderFriendItem]
  );

  const renderFooter = useCallback(() => {
    return (
      <View className="px-6 pt-4 pb-6">
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
      </View>
    );
  }, [handleShare, handleShowQRCode, isDark]);

  const getItemType = useCallback((item: FlashListItem) => {
    return typeof item === "string" ? "sectionHeader" : "friend";
  }, []);

  const handleCloseQRCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    qrCodeSheetRef.current?.dismiss();
  }, []);

  if (!receiptId) return null;

  return (
    <>
      <TrueSheet
        ref={bottomSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={['auto']}
      >
        <View className="flex-1">
          {/* Header with close button */}
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

          {/* Friends List */}
          {friends.length === 0 ? (
            <View
              className="flex-1 justify-center items-center px-6 pb-6 min-h-64"
            >
              <ThemedText size="base" className="opacity-70 text-center">
                No friends yet. Add friends to share receipts with them directly.
              </ThemedText>
              {renderFooter()}
            </View>
          ) : (
            <FlashList
              data={flashListData}
              renderItem={renderItem}
              getItemType={getItemType}
              stickyHeaderIndices={stickyHeaderIndices}
              ListFooterComponent={renderFooter}
              keyExtractor={(item, index) => {
                if (typeof item === "string") {
                  return `section-${item}-${index}`;
                }
                return `friend-${item.id}-${index}`;
              }}
            />
          )}
        </View>
      </TrueSheet>

      {/* QR Code Sheet */}
      <TrueSheet
        ref={qrCodeSheetRef}
        backgroundColor={
          isDark ? Colors.dark.background : Colors.light.background
        }
        detents={['auto']}
      >
        <View className="flex-1 px-6 pt-8 pb-6">
          {/* Header with close button */}
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

          {/* QR Code Section */}
          <View className="items-center">
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
              Show this QR code to your friends.
            </ThemedText>
          </View>
        </View>
      </TrueSheet>
    </>
  );
}
