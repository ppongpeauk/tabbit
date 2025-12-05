/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Hook for checking Tabbit Pro entitlement status
 */

import { useRevenueCat } from "@/contexts/revenuecat-context";

export function useProEntitlement() {
  const { isPro, isLoading, checkEntitlement } = useRevenueCat();

  return {
    isPro,
    isLoading,
    refresh: checkEntitlement,
  };
}
