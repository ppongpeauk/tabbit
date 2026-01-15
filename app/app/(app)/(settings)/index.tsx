/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Settings screen with sectioned list layout
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import {
  View,
  SectionList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth-context";
import { API_BASE_URL } from "@/utils/config";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";

const TOKEN_STORAGE_KEY = "tabbit.token";
const AUTH_STORAGE_KEY = "tabbit.auth";

interface SettingItem {
  id: string;
  label: string;
  onPress: () => void;
  variant?: "default" | "destructive";
  showChevron?: boolean;
}

interface Section {
  title: string;
  data: SettingItem[];
}

interface SectionItem {
  type: "section";
  section: Section;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signOut, user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAboutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./about");
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:support@usetabbit.com");
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token || !user) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete account");
      }

      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeleteModal(false);
      // Auth state cleared, root layout will handle navigation to (auth) stack
    } catch (error) {
      console.error("Error deleting account:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setIsDeleting(false);
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            // Navigation will be handled by (app)/_layout.tsx useEffect when user becomes null
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  const handleGeneralPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./general");
  };

  const handleAppPermissionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./permissions");
  };

  const handleAppIntegrationsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("App Integrations", "App integrations settings coming soon");
  };


  const sections: Section[] = [
    {
      title: "Settings",
      data: [
        {
          id: "general",
          label: "General",
          onPress: handleGeneralPress,
          showChevron: true,
        },
        {
          id: "permissions",
          label: "App Permissions",
          onPress: handleAppPermissionsPress,
          showChevron: true,
        },
        {
          id: "integrations",
          label: "App Integrations",
          onPress: handleAppIntegrationsPress,
          showChevron: true,
        },
      ],
    },
    {
      title: "About the app",
      data: [
        {
          id: "about",
          label: "About",
          onPress: handleAboutPress,
          showChevron: true,
        },
      ],
    },
    {
      title: "Other",
      data: [
        {
          id: "contact",
          label: "Contact Support",
          onPress: handleContactSupport,
          showChevron: true,
        },
        {
          id: "delete",
          label: "Delete Account",
          onPress: handleDeleteAccount,
          variant: "destructive" as const,
        },
        {
          id: "signout",
          label: "Sign Out",
          onPress: handleSignOut,
          variant: "destructive" as const,
        },
      ],
    },
  ];

  const sectionListData: { title: string; data: SectionItem[] }[] =
    sections.map((section) => ({
      title: section.title,
      data: [{ type: "section", section }],
    }));

  const renderSectionContainer = (section: Section) => {
    const separatorColor =
      colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";
    const pressedBg =
      colorScheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.03)";

    return (
      <View
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 1)",
          borderWidth: colorScheme === "light" ? 1 : 0,
          borderColor:
            colorScheme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
        }}
      >
        {section.data.map((item, index) => {
          const isDestructive = item.variant === "destructive";
          const isDisabled = false;

          return (
            <View key={item.id}>
              {index > 0 && (
                <View
                  className="h-[1px] mx-4"
                  style={{ backgroundColor: separatorColor }}
                />
              )}
              <Pressable
                cssInterop={false}
                onPress={item.onPress}
                disabled={isDisabled}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? pressedBg : "transparent",
                  opacity: isDisabled ? 0.5 : 1,
                })}
              >
                <ThemedText
                  size="base"
                  style={isDestructive ? { color: "#FF3B30" } : undefined}
                >
                  {item.label}
                </ThemedText>
                {item.showChevron && (
                  <SymbolView
                    name="chevron.right"
                    size={18}
                    tintColor={
                      colorScheme === "dark"
                        ? Colors.dark.icon
                        : Colors.light.icon
                    }
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({
    item,
  }: {
    item: SectionItem;
    index: number;
    section: { title: string; data: SectionItem[] };
  }) => {
    if (item.type === "section") {
      return (
        <View key={item.section.title || "default"}>
          {renderSectionContainer(item.section)}
        </View>
      );
    }
    return null;
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View className="px-1 pt-0">
      <ThemedText className="text-[13px] font-semibold uppercase tracking-widest opacity-60">
        {section.title}
      </ThemedText>
    </View>
  );

  const renderSectionFooter = () => <View className="h-8" />;

  return (
    <>
      <View
        className="flex-1"
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? Colors.dark.background
              : Colors.light.background,
        }}
      >
        <SectionList
          sections={sectionListData}
          keyExtractor={(item, index) => {
            if (item.type === "section") {
              return `section-${item.section.title || index}`;
            }
            return `item-${index}`;
          }}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => {
            const originalSection =
              section.data[0]?.type === "section"
                ? section.data[0].section
                : null;
            return (
              <View className="mb-1">
                {originalSection &&
                  renderSectionHeader({ section: originalSection })}
              </View>
            );
          }}
          renderSectionFooter={renderSectionFooter}
          contentContainerClassName="px-5 pt-5 pb-[100px]"
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={null}
        />
      </View>

      <Modal
        visible={showDeleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <ThemedView className="flex-1">
          <View
            className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b"
            style={{
              borderBottomColor:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <ThemedText size="xl" weight="bold">
              Delete Account
            </ThemedText>
            {!isDeleting && (
              <Pressable onPress={() => setShowDeleteModal(false)}>
                <SymbolView
                  name="xmark"
                  tintColor={isDark ? Colors.dark.text : Colors.light.text}
                />
              </Pressable>
            )}
          </View>
          <ScrollView className="flex-1 px-5 pt-6">
            <ThemedText size="lg" weight="semibold" className="mb-3">
              Are you sure?
            </ThemedText>
            <ThemedText size="base" className="mb-6 opacity-80 leading-[22px]">
              This action cannot be undone. Deleting your account will
              permanently:
            </ThemedText>
            <View className="gap-4 mb-6">
              <View className="flex-row items-start gap-3">
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  className="mt-0.5"
                />
                <ThemedText size="base" className="flex-1 leading-[22px]">
                  Delete all your receipts and expense data
                </ThemedText>
              </View>
              <View className="flex-row items-start gap-3">
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  className="mt-0.5"
                />
                <ThemedText size="base" className="flex-1 leading-[22px]">
                  Remove all split expense records
                </ThemedText>
              </View>
              <View className="flex-row items-start gap-3">
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  className="mt-0.5"
                />
                <ThemedText size="base" className="flex-1 leading-[22px]">
                  Cancel any pending expense splits
                </ThemedText>
              </View>
              <View className="flex-row items-start gap-3">
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  className="mt-0.5"
                />
                <ThemedText size="base" className="flex-1 leading-[22px]">
                  Permanently remove your account and all associated data
                </ThemedText>
              </View>
            </View>
            <ThemedText
              size="sm"
              className="font-semibold leading-5 mt-2"
              style={{
                color: isDark
                  ? "rgba(255, 59, 48, 0.8)"
                  : "rgba(255, 59, 48, 0.9)",
              }}
            >
              This action is irreversible. If you&apos;re sure you want to
              proceed, click the delete button below.
            </ThemedText>
          </ScrollView>
          <View
            className="flex-row gap-3 px-5 py-5 border-t"
            style={{
              borderTopColor:
                colorScheme === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Button
              variant="secondary"
              onPress={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              style={{ flex: 1 }}
            >
              Nevermind
            </Button>
            <Button
              variant="destructive"
              onPress={confirmDeleteAccount}
              loading={isDeleting}
              disabled={isDeleting}
              style={{ flex: 1 }}
            >
              Delete Account
            </Button>
          </View>
        </ThemedView>
      </Modal>
    </>
  );
}

// Styles removed in favor of Tailwind CSS (NativeWind)
