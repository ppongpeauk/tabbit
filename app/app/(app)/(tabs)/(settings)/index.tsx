/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Settings screen with sectioned list layout
 */

import { LimitIndicator } from "@/components/settings/limit-indicator";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/button";
import {
  View,
  SectionList,
  Pressable,
  StyleSheet,
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
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { presentPaywall, presentCustomerCenter } from "@/utils/paywall";
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
  const { isPro, restorePurchases, redeemPromoCode } = useRevenueCat();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleAboutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("./about");
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:support@usetabbit.com");
  };

  const handleUpgradeToPro = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await presentPaywall();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleManageSubscription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await presentCustomerCenter();
  };

  const handleRestorePurchases = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error restoring purchases:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRedeemPromoCode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRedeeming(true);
    try {
      const success = await redeemPromoCode();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error redeeming promo code:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRedeeming(false);
    }
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
      router.replace("/sign-in");
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
            router.replace("/sign-in");
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  const handleGeneralPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("General", "General settings coming soon");
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
      title: "Subscription",
      data: [
        ...(isPro
          ? [
              {
                id: "manage",
                label: "Manage Subscription",
                onPress: handleManageSubscription,
                showChevron: true,
              },
            ]
          : [
              {
                id: "upgrade",
                label: "Upgrade to Tabbit Pro",
                onPress: handleUpgradeToPro,
                showChevron: true,
              },
            ]),
        {
          id: "promo",
          label: "Have a promo code?",
          onPress: handleRedeemPromoCode,
          showChevron: false,
        },
        {
          id: "restore",
          label: "Restore Purchases",
          onPress: handleRestorePurchases,
          showChevron: false,
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
        style={[
          styles.sectionContainer,
          {
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 1)",
            borderWidth: colorScheme === "light" ? 1 : 0,
            borderColor:
              colorScheme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
          },
        ]}
      >
        {section.data.map((item, index) => {
          const isDestructive = item.variant === "destructive";
          const isDisabled =
            (item.id === "restore" && isRestoring) ||
            (item.id === "promo" && isRedeeming);

          return (
            <View key={item.id}>
              {index > 0 && (
                <View
                  style={[
                    styles.itemSeparator,
                    { backgroundColor: separatorColor },
                  ]}
                />
              )}
              <Pressable
                onPress={item.onPress}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.settingItem,
                  {
                    backgroundColor: pressed ? pressedBg : "transparent",
                    opacity: isDisabled ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.settingLabel,
                    isDestructive && { color: "#FF3B30" },
                  ]}
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
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
    </View>
  );

  const renderSectionFooter = () => <View style={styles.sectionSeparator} />;

  return (
    <>
      <View
        style={{
          flex: 1,
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
              <View style={styles.sectionWrapper}>
                {originalSection &&
                  renderSectionHeader({ section: originalSection })}
              </View>
            );
          }}
          renderSectionFooter={renderSectionFooter}
          ListHeaderComponent={<LimitIndicator />}
          contentContainerStyle={styles.contentContainer}
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
        <ThemedView style={styles.modalContainer}>
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
              },
            ]}
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
          <ScrollView style={styles.modalContent}>
            <ThemedText size="lg" weight="semibold" style={styles.modalTitle}>
              Are you sure?
            </ThemedText>
            <ThemedText size="base" style={styles.modalDescription}>
              This action cannot be undone. Deleting your account will
              permanently:
            </ThemedText>
            <View style={styles.consequencesList}>
              <View style={styles.consequenceItem}>
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  style={styles.consequenceIcon}
                />
                <ThemedText size="base" style={styles.consequenceText}>
                  Delete all your receipts and expense data
                </ThemedText>
              </View>
              <View style={styles.consequenceItem}>
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  style={styles.consequenceIcon}
                />
                <ThemedText size="base" style={styles.consequenceText}>
                  Remove all split expense records
                </ThemedText>
              </View>
              <View style={styles.consequenceItem}>
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  style={styles.consequenceIcon}
                />
                <ThemedText size="base" style={styles.consequenceText}>
                  Cancel any pending expense splits
                </ThemedText>
              </View>
              <View style={styles.consequenceItem}>
                <SymbolView
                  name="minus.circle.fill"
                  tintColor="#FF3B30"
                  style={styles.consequenceIcon}
                />
                <ThemedText size="base" style={styles.consequenceText}>
                  Permanently remove your account and all associated data
                </ThemedText>
              </View>
            </View>
            <ThemedText
              size="sm"
              style={[
                styles.modalWarning,
                {
                  color: isDark
                    ? "rgba(255, 59, 48, 0.8)"
                    : "rgba(255, 59, 48, 0.9)",
                },
              ]}
            >
              This action is irreversible. If you&apos;re sure you want to
              proceed, click the delete button below.
            </ThemedText>
          </ScrollView>
          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor:
                  colorScheme === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
              },
            ]}
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

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionWrapper: {
    marginBottom: 4,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 0,
  },
  sectionHeaderText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  sectionContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  itemSeparator: {
    height: 1,
    marginHorizontal: 16,
  },
  sectionSeparator: {
    height: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  modalTitle: {
    marginBottom: 12,
  },
  modalDescription: {
    marginBottom: 24,
    opacity: 0.8,
    lineHeight: 22,
  },
  consequencesList: {
    gap: 16,
    marginBottom: 24,
  },
  consequenceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  consequenceIcon: {
    marginTop: 2,
  },
  consequenceText: {
    flex: 1,
    lineHeight: 22,
  },
  modalWarning: {
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
});
