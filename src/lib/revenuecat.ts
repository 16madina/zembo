import { isNative, isIOS, isAndroid } from "./capacitor";

// RevenueCat configuration
const REVENUECAT_IOS_API_KEY = "appl_IUfWQEYxbRpEbcSfhBQFLYuZlpq";
const REVENUECAT_ANDROID_API_KEY = ""; // Add Android key when available

// Product identifiers
export const PRODUCT_IDS = {
  gold: "zembo_gold_monthly",
  platinum: "zembo_platinum_monthly",
} as const;

// Entitlements
export const ENTITLEMENTS = {
  gold: "gold",
  platinum: "platinum",
} as const;

// Offering and package IDs
export const OFFERING_ID = "default";
export const PACKAGE_IDS = {
  gold: "gold",
  platinum: "platinum",
} as const;

export type SubscriptionPlan = "gold" | "platinum";

export interface RevenueCatPackage {
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
  title: string;
  description: string;
  currencyCode: string;
}

export interface CustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, {
      identifier: string;
      productIdentifier: string;
      expirationDate: string | null;
      isActive: boolean;
    }>;
  };
  originalAppUserId: string;
}

let _revenueCatInitialized = false;
let _purchasesModule: any = null;

// Lazy load RevenueCat module
const getPurchasesModule = async () => {
  if (_purchasesModule) return _purchasesModule;
  
  if (!isNative) return null;
  
  try {
    _purchasesModule = await import("@revenuecat/purchases-capacitor");
    return _purchasesModule;
  } catch (error) {
    console.log("RevenueCat module not available:", error);
    return null;
  }
};

// Initialize RevenueCat SDK
export const initializeRevenueCat = async (userId?: string): Promise<boolean> => {
  if (!isNative) {
    console.log("RevenueCat: Not on native platform, skipping initialization");
    return false;
  }

  if (_revenueCatInitialized) {
    console.log("RevenueCat: Already initialized");
    return true;
  }

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) {
      console.log("RevenueCat: Module not available");
      return false;
    }

    const apiKey = isIOS ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
    
    if (!apiKey) {
      console.log("RevenueCat: No API key configured for this platform");
      return false;
    }

    await Purchases.Purchases.configure({
      apiKey,
      appUserID: userId || null,
    });

    _revenueCatInitialized = true;
    console.log("RevenueCat: Initialized successfully");
    return true;
  } catch (error) {
    console.error("RevenueCat: Initialization failed:", error);
    return false;
  }
};

// Login user to RevenueCat (for syncing with Supabase user)
export const loginRevenueCat = async (userId: string): Promise<CustomerInfo | null> => {
  if (!isNative || !_revenueCatInitialized) return null;

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return null;

    const { customerInfo } = await Purchases.Purchases.logIn({ appUserID: userId });
    return customerInfo as CustomerInfo;
  } catch (error) {
    console.error("RevenueCat: Login failed:", error);
    return null;
  }
};

// Logout user from RevenueCat
export const logoutRevenueCat = async (): Promise<void> => {
  if (!isNative || !_revenueCatInitialized) return;

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return;

    await Purchases.Purchases.logOut();
    console.log("RevenueCat: Logged out");
  } catch (error) {
    console.error("RevenueCat: Logout failed:", error);
  }
};

// Get current customer info
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isNative || !_revenueCatInitialized) return null;

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return null;

    const { customerInfo } = await Purchases.Purchases.getCustomerInfo();
    return customerInfo as CustomerInfo;
  } catch (error) {
    console.error("RevenueCat: Failed to get customer info:", error);
    return null;
  }
};

// Get available offerings (subscription packages)
export const getOfferings = async (): Promise<RevenueCatPackage[] | null> => {
  if (!isNative || !_revenueCatInitialized) return null;

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return null;

    const { offerings } = await Purchases.Purchases.getOfferings();
    
    if (!offerings?.current) {
      console.log("RevenueCat: No current offering available");
      return null;
    }

    const packages: RevenueCatPackage[] = offerings.current.availablePackages.map((pkg: any) => ({
      identifier: pkg.identifier,
      productId: pkg.product.identifier,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      title: pkg.product.title,
      description: pkg.product.description,
      currencyCode: pkg.product.currencyCode,
    }));

    return packages;
  } catch (error) {
    console.error("RevenueCat: Failed to get offerings:", error);
    return null;
  }
};

// Purchase a package
export const purchasePackage = async (
  packageIdentifier: string
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
  if (!isNative || !_revenueCatInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) {
      return { success: false, error: "RevenueCat module not available" };
    }

    // Get offerings to find the package
    const { offerings } = await Purchases.Purchases.getOfferings();
    
    if (!offerings?.current) {
      return { success: false, error: "No offerings available" };
    }

    const pkg = offerings.current.availablePackages.find(
      (p: any) => p.identifier === packageIdentifier
    );

    if (!pkg) {
      return { success: false, error: `Package ${packageIdentifier} not found` };
    }

    // Make the purchase
    const { customerInfo } = await Purchases.Purchases.purchasePackage({ aPackage: pkg });
    
    console.log("RevenueCat: Purchase successful", customerInfo);
    return { success: true, customerInfo: customerInfo as CustomerInfo };
  } catch (error: any) {
    console.error("RevenueCat: Purchase failed:", error);
    
    // Handle user cancellation
    if (error.userCancelled || error.code === "1" || error.message?.includes("cancelled")) {
      return { success: false, error: "Achat annulé" };
    }
    
    return { success: false, error: error.message || "Purchase failed" };
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
  if (!isNative || !_revenueCatInitialized) {
    return { success: false, error: "RevenueCat not initialized" };
  }

  try {
    const Purchases = await getPurchasesModule();
    if (!Purchases) {
      return { success: false, error: "RevenueCat module not available" };
    }

    const { customerInfo } = await Purchases.Purchases.restorePurchases();
    console.log("RevenueCat: Purchases restored", customerInfo);
    return { success: true, customerInfo: customerInfo as CustomerInfo };
  } catch (error: any) {
    console.error("RevenueCat: Restore failed:", error);
    return { success: false, error: error.message || "Restore failed" };
  }
};

// Check if user has active entitlement
export const hasEntitlement = async (entitlement: string): Promise<boolean> => {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;
  
  return !!customerInfo.entitlements.active[entitlement]?.isActive;
};

// Get subscription tier from customer info
export const getSubscriptionTier = (customerInfo: CustomerInfo | null): "free" | "premium" | "vip" => {
  if (!customerInfo) return "free";
  
  // Platinum includes Gold entitlement, check Platinum first
  if (customerInfo.entitlements.active[ENTITLEMENTS.platinum]?.isActive) {
    return "vip";
  }
  
  if (customerInfo.entitlements.active[ENTITLEMENTS.gold]?.isActive) {
    return "premium";
  }
  
  return "free";
};

// Check if RevenueCat is available
export const isRevenueCatAvailable = (): boolean => {
  return isNative && _revenueCatInitialized;
};
