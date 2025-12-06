import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import {
  getFriends,
  type Friend,
} from "@/utils/storage";
import {
  fetchContacts,
  requestContactsPermission,
  type ContactInfo,
} from "@/utils/contacts";
import { SplitStrategy } from "@/utils/split";
import { FriendSelector } from "@/components/split/friend-selector";
import { EmptyState } from "@/components/empty-state";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPLIT_DATA_KEY = "@tabbit:split_temp_data";

export default function AddPeopleScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [splitData, setSplitData] = useState<{
    receiptId: string;
    groupId?: string;
    strategy: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const tempDataStr = await AsyncStorage.getItem(SPLIT_DATA_KEY);
      if (!tempDataStr) {
        Alert.alert("Error", "Missing split data");
        router.replace("/split");
        return;
      }
      const tempData = JSON.parse(tempDataStr);
      setSplitData(tempData);

      if (tempData.selectedFriendIds) {
        setSelectedFriendIds(tempData.selectedFriendIds);
      }

      const loadedFriends = await getFriends();
      setFriends(loadedFriends);

      try {
        const hasPermission = await requestContactsPermission();
        if (hasPermission) {
          const contacts = await fetchContacts();
          setDeviceContacts(contacts);
        }
      } catch (error) {
        console.error("Error loading contacts:", error);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFriend = useCallback((friendId: string) => {
    const isSelected = selectedFriendIds.includes(friendId);
    if (isSelected) {
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== friendId));
    } else {
      setSelectedFriendIds([...selectedFriendIds, friendId]);
    }
  }, [selectedFriendIds]);

  const handleContinue = useCallback(async () => {
    if (selectedFriendIds.length === 0) {
      Alert.alert("Error", "Please select at least one person");
      return;
    }

    if (!splitData) {
      Alert.alert("Error", "Missing split data");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await AsyncStorage.setItem(
      SPLIT_DATA_KEY,
      JSON.stringify({
        ...splitData,
        selectedFriendIds,
      })
    );

    if (splitData.strategy === SplitStrategy.CUSTOM || splitData.strategy === "custom") {
      router.push("/split/custom-inputs");
    } else if (splitData.strategy === SplitStrategy.PERCENTAGE || splitData.strategy === "percentage") {
      router.push("/split/custom-inputs");
    } else if (splitData.strategy === SplitStrategy.ITEMIZED || splitData.strategy === "itemized") {
      router.push("/split/itemized-assign");
    } else {
      router.push("/split/review");
    }
  }, [selectedFriendIds, splitData]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? Colors.dark.text : Colors.light.text}
        />
      </View>
    );
  }

  if (friends.length === 0 && deviceContacts.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
      >
        <EmptyState
          icon="person.2.fill"
          title="No Contacts Available"
          subtitle="Please add friends in Settings or grant contacts permission to split receipts with people."
          action={
            <Button
              variant="primary"
              onPress={() => router.push("/(tabs)/(settings)/friends")}
              fullWidth
            >
              Go to Friends
            </Button>
          }
        />
      </View>
    );
  }

  const hasContacts = friends.length > 0 || deviceContacts.length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      {!hasContacts ? (
        <EmptyState
          icon="person.2.fill"
          title="No Contacts Available"
          subtitle="Please add friends in Settings or grant contacts permission to split receipts with people."
          action={
            <Button
              variant="primary"
              onPress={() => router.push("/(tabs)/(settings)/friends")}
              fullWidth
            >
              Go to Friends
            </Button>
          }
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stepContainer}>
              <ThemedText size="xl" weight="bold" style={styles.stepTitle}>
                Add People
              </ThemedText>
              <FriendSelector
                friends={friends}
                deviceContacts={deviceContacts}
                selectedFriendIds={selectedFriendIds}
                onToggleFriend={handleToggleFriend}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </View>
          </ScrollView>

          {/* Continue Button */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: isDark
                  ? Colors.dark.background
                  : Colors.light.background,
                borderTopColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            <Button
              variant="primary"
              onPress={handleContinue}
              disabled={selectedFriendIds.length === 0}
              fullWidth
            >
              Continue
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 100,
  },
  stepContainer: {
    gap: 16,
  },
  stepTitle: {
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

