/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description RevenueCat subscription management context
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import { Alert } from "react-native";
import { useAuth } from "./auth-context";
import { API_BASE_URL } from "@/utils/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_STORAGE_KEY = "tabbit.token";

const ENTITLEMENT_ID = "Tabbit Pro";

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isPro: boolean;
  isLoading: boolean;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkEntitlement: () => Promise<boolean>;
  getPackages: () => PurchasesPackage[] | null;
  redeemPromoCode: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(
  undefined
);

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeRevenueCat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id);
    } else {
      Purchases.logOut().catch((err) => {
        console.error("Error logging out RevenueCat:", err);
      });
      setCustomerInfo(null);
      setCurrentOffering(null);
      setIsPro(false);
    }
  }, [user?.id]);

  const initializeRevenueCat = async () => {
    try {
      setIsLoading(true);
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      await Purchases.configure({ apiKey: "test_cwIWvGSTYoCBlzCCELUsOOWsPEr" });
      if (user?.id) {
        await identifyUser(user.id);
      }
      await refreshCustomerInfo();
    } catch (err) {
      console.error("RevenueCat initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const identifyUser = async (userId: string) => {
    try {
      await Purchases.logIn(userId);
    } catch (err) {
      console.error("Error identifying RevenueCat user:", err);
    }
  };

  const syncSubscriptionWithServer = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) return;

      await fetch(`${API_BASE_URL}/subscription/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error syncing subscription with server:", error);
    }
  }, [user?.id]);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const [info, offering] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      setCustomerInfo(info);
      setCurrentOffering(offering.current);
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);

      if (hasPro && user?.id) {
        await syncSubscriptionWithServer();
      }

      return info;
    } catch (err) {
      console.error("Error refreshing customer info:", err);
      throw err;
    }
  }, [user?.id, syncSubscriptionWithServer]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(
        pkg
      );
      setCustomerInfo(updatedInfo);
      const hasPro =
        updatedInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);

      if (hasPro && user?.id) {
        await syncSubscriptionWithServer();
        Alert.alert("Success!", "Thank you for subscribing to Tabbit Pro!", [
          { text: "OK" },
        ]);
      }
      return true;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "userCancelled" in err) {
        return false;
      }

      let errorMessage = "Purchase failed. Please try again.";
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR
      ) {
        errorMessage =
          "Your payment is pending. Your subscription will activate once payment is confirmed.";
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === PURCHASES_ERROR_CODE.NETWORK_ERROR
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error("Purchase error:", err);
      Alert.alert("Purchase Failed", errorMessage, [{ text: "OK" }]);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);

      if (hasPro) {
        if (user?.id) {
          await syncSubscriptionWithServer();
        }
        Alert.alert(
          "Purchases Restored",
          "Your Tabbit Pro subscription has been restored!",
          [{ text: "OK" }]
        );
        return true;
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any purchases to restore. Make sure you're signed in with the same Apple ID or Google account you used to purchase.",
          [{ text: "OK" }]
        );
        return false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to restore purchases. Please try again.";
      console.error("Restore purchases error:", err);
      Alert.alert("Restore Failed", errorMessage, [{ text: "OK" }]);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkEntitlement = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.getCustomerInfo();
      const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);
      setCustomerInfo(info);
      return hasPro;
    } catch (err) {
      console.error("Error checking entitlement:", err);
      return false;
    }
  }, []);

  const getPackages = (): PurchasesPackage[] | null => {
    return currentOffering?.availablePackages || null;
  };

  const redeemPromoCode = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      await Purchases.presentCodeRedemptionSheet();
      // Refresh customer info after redemption to check if entitlement was granted
      const updatedInfo = await Purchases.getCustomerInfo();
      setCustomerInfo(updatedInfo);
      const hasPro =
        updatedInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(hasPro);

      if (hasPro && user?.id) {
        await syncSubscriptionWithServer();
        Alert.alert(
          "Promo Code Redeemed!",
          "Thank you for subscribing to Tabbit Pro!",
          [{ text: "OK" }]
        );
        return true;
      }
      // Refresh offerings as well
      await refreshCustomerInfo();
      return true;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "userCancelled" in err &&
        err.userCancelled
      ) {
        // User cancelled the redemption sheet, don't show error
        return false;
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to redeem promo code. Please try again.";
      console.error("Promo code redemption error:", err);
      Alert.alert("Redemption Failed", errorMessage, [{ text: "OK" }]);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        currentOffering,
        isPro,
        isLoading,
        refreshCustomerInfo: () => refreshCustomerInfo().then(() => undefined),
        purchasePackage,
        restorePurchases,
        checkEntitlement,
        getPackages,
        redeemPromoCode,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
