# RevenueCat Integration Setup Guide

## Overview
This document outlines the RevenueCat SDK integration for Tabbit app, including subscription management, entitlement checking, and paywall presentation.

## Installation

The RevenueCat SDK packages are already installed:
- `react-native-purchases` (v9.6.9)
- `react-native-purchases-ui` (v9.6.9)

If you need to reinstall:
```bash
bunx expo install react-native-purchases react-native-purchases-ui
```

## Configuration

### API Key
The RevenueCat API key is configured in `/app/contexts/revenuecat-context.tsx`:
- **Test API Key**: `test_cwIWvGSTYoCBlzCCELUsOOWsPEr`
- Used for both iOS and Android

### Entitlement
- **Entitlement ID**: `Tabbit Pro`
- This entitlement is checked throughout the app to determine premium status

### Products
Configure these products in RevenueCat Dashboard:
- **Monthly**: Product identifier `monthly`
- **Yearly**: Product identifier `yearly`

## Architecture

### 1. RevenueCat Context (`/app/contexts/revenuecat-context.tsx`)
Main context provider that:
- Initializes RevenueCat SDK
- Identifies users with their user ID
- Manages customer info and offerings
- Provides subscription purchase/restore functionality
- Tracks Tabbit Pro entitlement status

**Key Features:**
- Automatic user identification when auth user changes
- Real-time entitlement checking
- Error handling with user-friendly alerts
- Customer info refresh functionality

### 2. Paywall Utilities (`/app/utils/paywall.ts`)
Utility functions for:
- `presentPaywall()`: Shows RevenueCat Paywall UI
- `presentCustomerCenter()`: Opens RevenueCat Customer Center for subscription management

### 3. Pro Entitlement Hook (`/app/hooks/use-pro-entitlement.ts`)
Custom hook for checking Tabbit Pro status:
```typescript
const { isPro, isLoading, refresh } = useProEntitlement();
```

### 4. Settings Integration (`/app/app/(app)/(tabs)/(settings)/index.tsx`)
Settings page includes:
- **Subscription Section**:
  - "Upgrade to Tabbit Pro" (if not subscribed)
  - "Manage Subscription" (if subscribed)
  - "Restore Purchases" (always available)

## Usage Examples

### Check if User Has Pro
```typescript
import { useProEntitlement } from "@/hooks/use-pro-entitlement";

function MyComponent() {
  const { isPro, isLoading } = useProEntitlement();

  if (isLoading) return <Loading />;
  if (isPro) return <ProFeature />;
  return <UpgradePrompt />;
}
```

### Present Paywall
```typescript
import { presentPaywall } from "@/utils/paywall";

const handleUpgrade = async () => {
  const success = await presentPaywall();
  if (success) {
    // User purchased or restored
  }
};
```

### Purchase Specific Package
```typescript
import { useRevenueCat } from "@/contexts/revenuecat-context";

function UpgradeScreen() {
  const { currentOffering, purchasePackage } = useRevenueCat();

  const handlePurchase = async () => {
    const monthlyPackage = currentOffering?.availablePackages.find(
      pkg => pkg.identifier === "$rc_monthly"
    );
    if (monthlyPackage) {
      await purchasePackage(monthlyPackage);
    }
  };
}
```

### Restore Purchases
```typescript
import { useRevenueCat } from "@/contexts/revenuecat-context";

const { restorePurchases } = useRevenueCat();
await restorePurchases();
```

### Open Customer Center
```typescript
import { presentCustomerCenter } from "@/utils/paywall";

await presentCustomerCenter();
```

## RevenueCat Dashboard Setup

### 1. Create Products
1. Go to RevenueCat Dashboard → Products
2. Create products:
   - **Monthly**: `monthly` (matching your App Store Connect/Play Console product ID)
   - **Yearly**: `yearly` (matching your App Store Connect/Play Console product ID)

### 2. Create Entitlement
1. Go to RevenueCat Dashboard → Entitlements
2. Create entitlement: **Tabbit Pro**
3. Attach both `monthly` and `yearly` products to this entitlement

### 3. Create Offering
1. Go to RevenueCat Dashboard → Offerings
2. Create a default offering
3. Add packages:
   - Monthly package (using `monthly` product)
   - Yearly package (using `yearly` product)

### 4. Configure Paywall
1. Go to RevenueCat Dashboard → Paywalls
2. Create a paywall for your default offering
3. Customize the design to match your app's theme
4. Set as default paywall

### 5. Configure Customer Center
1. Go to RevenueCat Dashboard → Customer Center
2. Enable Customer Center
3. Customize the appearance

## Testing

### Sandbox Testing
1. Use test accounts in App Store Connect/Play Console
2. Test purchases will be in sandbox mode
3. Test restore purchases functionality
4. Verify entitlement status updates correctly

### Test Scenarios
- ✅ Purchase monthly subscription
- ✅ Purchase yearly subscription
- ✅ Restore purchases
- ✅ Check entitlement status
- ✅ Open customer center
- ✅ Cancel subscription (via customer center)
- ✅ Handle purchase errors gracefully
- ✅ Handle network errors

## Error Handling

The implementation includes comprehensive error handling:
- Network errors with retry suggestions
- Payment pending states
- User cancellation (no error shown)
- Invalid configuration errors
- Entitlement verification failures

## Best Practices

1. **Always check entitlement status** before showing premium features
2. **Refresh customer info** after purchase/restore operations
3. **Handle loading states** when checking entitlements
4. **Provide restore purchases option** in settings
5. **Use Customer Center** for subscription management
6. **Test thoroughly** in sandbox before production

## Troubleshooting

### Paywall Not Showing
- Check that an offering is configured in RevenueCat Dashboard
- Verify the offering has packages attached
- Ensure a paywall is configured for the offering

### Entitlement Not Activating
- Verify products are attached to the entitlement
- Check that purchases are completing successfully
- Refresh customer info after purchase

### User Identification Issues
- Ensure user is logged in before checking entitlements
- Verify RevenueCat user ID matches your app's user ID
- Check RevenueCat logs for identification errors

## Next Steps

1. Configure products in App Store Connect (iOS) and Play Console (Android)
2. Set up products and entitlements in RevenueCat Dashboard
3. Create and customize paywall in RevenueCat Dashboard
4. Test purchases in sandbox environment
5. Update production API key when ready to launch

## Support

- RevenueCat Docs: https://www.revenuecat.com/docs
- RevenueCat Support: https://www.revenuecat.com/support
