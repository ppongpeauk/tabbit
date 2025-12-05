/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description RevenueCat Paywall utilities
 */

import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Purchases from "react-native-purchases";
import { Alert } from "react-native";

export async function presentPaywall(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      Alert.alert(
        "No Offerings Available",
        "Please check your RevenueCat configuration. No current offering found.",
        [{ text: "OK" }]
      );
      return false;
    }

    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    switch (paywallResult) {
      case PAYWALL_RESULT.PURCHASED:
        Alert.alert("Success!", "Thank you for subscribing to Tabbit Pro!", [
          { text: "OK" },
        ]);
        return true;
      case PAYWALL_RESULT.RESTORED:
        Alert.alert(
          "Purchases Restored",
          "Your Tabbit Pro subscription has been restored!",
          [{ text: "OK" }]
        );
        return true;
      case PAYWALL_RESULT.CANCELLED:
        return false;
      case PAYWALL_RESULT.NOT_PRESENTED:
        Alert.alert(
          "Paywall Not Available",
          "Unable to present paywall. Please try again later.",
          [{ text: "OK" }]
        );
        return false;
      case PAYWALL_RESULT.ERROR:
        Alert.alert(
          "Error",
          "An error occurred while processing your purchase. Please try again.",
          [{ text: "OK" }]
        );
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.error("Error presenting paywall:", error);
    Alert.alert(
      "Error",
      `Failed to present paywall: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
      [{ text: "OK" }]
    );
    return false;
  }
}

export async function presentCustomerCenter(): Promise<boolean> {
  try {
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch (error) {
    console.error("Error presenting customer center:", error);
    Alert.alert(
      "Error",
      `Failed to open customer center: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
      [{ text: "OK" }]
    );
    return false;
  }
}
