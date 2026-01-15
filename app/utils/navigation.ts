/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Navigation utilities for shared header styling, screen options, and route helpers
 */

import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Colors, Fonts } from "@/constants/theme";

/**
 * Creates common header screen options with consistent styling
 * @param colorScheme - Current color scheme ("light" | "dark" | null | undefined)
 * @param includeLargeTitle - Whether to include large title style (default: false)
 * @returns NativeStackNavigationOptions with common header styling
 */
export function getHeaderScreenOptions(
  colorScheme: "light" | "dark" | null | undefined,
  includeLargeTitle = false
): Partial<NativeStackNavigationOptions> {
  const baseOptions: Partial<NativeStackNavigationOptions> = {
    headerBackTitleStyle: {
      fontFamily: Fonts.sansBold,
    },
    headerTitleStyle: {
      fontFamily: Fonts.sansBold,
    },
    headerStyle: {
      backgroundColor:
        colorScheme === "dark"
          ? Colors.dark.background
          : Colors.light.background,
    },
  };

  if (includeLargeTitle) {
    baseOptions.headerLargeTitleStyle = {
      fontFamily: Fonts.sansBold,
    };
  }

  return baseOptions;
}

/**
 * Route paths for authenticated routes
 */
export const AppRoutes = {
  receipts: "/(app)/(tabs)/(receipts)",
  groups: "/(app)/(tabs)/(groups)",
  profile: "/(app)/(tabs)/(profile)",
  settings: "/(app)/(settings)",
  camera: "/(app)/camera",
  create: "/(app)/create",
  createManual: "/(app)/create-manual",
  barcodeScanner: "/(app)/barcode-scanner",
  receiptDetail: (id: string) => `/(app)/receipt/${id}`,
  receiptEdit: (id: string) => `/(app)/receipt/${id}/edit`,
  split: "/(app)/split",
  splitAddPeople: "/(app)/split/add-people",
  splitCustomInputs: "/(app)/split/custom-inputs",
  splitItemizedAssign: "/(app)/split/itemized-assign",
  splitReview: "/(app)/split/review",
  splitSent: "/(app)/split/sent",
  groupDetail: (id: string) => `/(app)/(tabs)/(groups)/${id}`,
  groupEdit: (id: string) => `/(app)/(tabs)/(groups)/${id}/edit`,
  groupDetails: (id: string) => `/(app)/(tabs)/(groups)/${id}/details`,
  groupCreate: "/(app)/(tabs)/(groups)/create",
  groupJoin: "/(app)/(tabs)/(groups)/join",
  settingsAbout: "/(app)/(settings)/about",
  settingsGeneral: "/(app)/(settings)/general",
  settingsPermissions: "/(app)/(settings)/permissions",
} as const;

/**
 * Route paths for unauthenticated routes
 */
export const AuthRoutes = {
  index: "/(auth)",
  signIn: "/(auth)/sign-in",
  signUp: "/(auth)/sign-up",
} as const;
