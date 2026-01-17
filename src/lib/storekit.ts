import { isNative, isIOS } from "./capacitor";

// StoreKit Product identifiers - must match App Store Connect
export const SUBSCRIPTION_PRODUCT_IDS = {
  gold: "zembo_gold_monthly",
  platinum: "zembo_platinum_monthly",
} as const;

export const COIN_PRODUCT_IDS = {
  coins_150: "zembo_coins_150",
  coins_500: "zembo_coins_500",
  coins_1200: "zembo_coins_1200",
  coins_3000: "zembo_coins_3000",
} as const;

// Map coin pack IDs to StoreKit product IDs
export const COIN_PACK_TO_PRODUCT: Record<string, { productId: string; coins: number; bonus: number }> = {
  basic: { productId: COIN_PRODUCT_IDS.coins_150, coins: 150, bonus: 10 },
  popular: { productId: COIN_PRODUCT_IDS.coins_500, coins: 500, bonus: 50 },
  premium: { productId: COIN_PRODUCT_IDS.coins_1200, coins: 1200, bonus: 200 },
  vip: { productId: COIN_PRODUCT_IDS.coins_3000, coins: 3000, bonus: 600 },
};

export type SubscriptionPlan = "gold" | "platinum";

export interface StoreKitProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currency: string;
  type: "subscription" | "consumable";
}

export interface StoreKitPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

let _storeInitialized = false;
let _storeModule: any = null;
let _products: Map<string, StoreKitProduct> = new Map();

// Lazy load the store module
const getStoreModule = async () => {
  if (_storeModule) return _storeModule;
  
  if (!isNative || !isIOS) return null;
  
  try {
    // cordova-plugin-purchase exposes CdvPurchase globally
    const store = (window as any).CdvPurchase?.store;
    if (store) {
      _storeModule = store;
      return _storeModule;
    }
    return null;
  } catch (error) {
    console.log("StoreKit module not available:", error);
    return null;
  }
};

// Initialize StoreKit
export const initializeStoreKit = async (userId?: string): Promise<boolean> => {
  if (!isNative || !isIOS) {
    console.log("StoreKit: Not on iOS native platform, skipping initialization");
    return false;
  }

  if (_storeInitialized) {
    console.log("StoreKit: Already initialized");
    return true;
  }

  try {
    const store = await getStoreModule();
    if (!store) {
      console.log("StoreKit: Module not available, waiting for device ready...");
      
      // Wait for Cordova to be ready
      return new Promise((resolve) => {
        document.addEventListener("deviceready", async () => {
          const retryStore = (window as any).CdvPurchase?.store;
          if (retryStore) {
            _storeModule = retryStore;
            const success = await setupStore(retryStore, userId);
            resolve(success);
          } else {
            console.log("StoreKit: Still not available after device ready");
            resolve(false);
          }
        }, false);
        
        // Timeout fallback
        setTimeout(() => resolve(false), 5000);
      });
    }

    return await setupStore(store, userId);
  } catch (error) {
    console.error("StoreKit: Initialization failed:", error);
    return false;
  }
};

const setupStore = async (store: any, userId?: string): Promise<boolean> => {
  try {
    const CdvPurchase = (window as any).CdvPurchase;
    
    // Set application username for receipt validation
    if (userId) {
      store.applicationUsername = userId;
    }

    // Register subscription products
    store.register([
      {
        id: SUBSCRIPTION_PRODUCT_IDS.gold,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: SUBSCRIPTION_PRODUCT_IDS.platinum,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
    ]);

    // Register consumable products (coins)
    Object.values(COIN_PRODUCT_IDS).forEach(productId => {
      store.register({
        id: productId,
        type: CdvPurchase.ProductType.CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      });
    });

    // Set up event handlers
    store.when()
      .productUpdated((product: any) => {
        console.log("StoreKit: Product updated", product.id);
        _products.set(product.id, {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.pricing?.price || 0,
          priceString: product.pricing?.priceMicros 
            ? `${(product.pricing.priceMicros / 1000000).toFixed(2)} ${product.pricing?.currency || 'USD'}`
            : product.pricing?.price?.toString() || "N/A",
          currency: product.pricing?.currency || "USD",
          type: product.type === CdvPurchase.ProductType.CONSUMABLE ? "consumable" : "subscription",
        });
      })
      .approved((transaction: any) => {
        console.log("StoreKit: Transaction approved", transaction.id);
        transaction.verify();
      })
      .verified((receipt: any) => {
        console.log("StoreKit: Receipt verified", receipt.id);
        receipt.finish();
      })
      .finished((transaction: any) => {
        console.log("StoreKit: Transaction finished", transaction.id);
      });

    // Initialize the store
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
    
    _storeInitialized = true;
    console.log("StoreKit: Initialized successfully");
    return true;
  } catch (error) {
    console.error("StoreKit: Setup failed:", error);
    return false;
  }
};

// Get product info
export const getProduct = (productId: string): StoreKitProduct | null => {
  return _products.get(productId) || null;
};

// Get all products
export const getAllProducts = (): StoreKitProduct[] => {
  return Array.from(_products.values());
};

// Get subscription products
export const getSubscriptionProducts = (): StoreKitProduct[] => {
  return [
    getProduct(SUBSCRIPTION_PRODUCT_IDS.gold),
    getProduct(SUBSCRIPTION_PRODUCT_IDS.platinum),
  ].filter((p): p is StoreKitProduct => p !== null);
};

// Get coin products
export const getCoinProducts = (): StoreKitProduct[] => {
  return Object.values(COIN_PRODUCT_IDS)
    .map(id => getProduct(id))
    .filter((p): p is StoreKitProduct => p !== null);
};

// Purchase a product
export const purchaseProduct = async (productId: string): Promise<StoreKitPurchaseResult> => {
  if (!isNative || !isIOS) {
    return { success: false, error: "StoreKit only available on iOS" };
  }

  if (!_storeInitialized) {
    return { success: false, error: "StoreKit not initialized" };
  }

  try {
    const store = await getStoreModule();
    if (!store) {
      return { success: false, error: "Store not available" };
    }

    const product = store.get(productId);
    if (!product) {
      return { success: false, error: `Product ${productId} not found` };
    }

    // Get the offer to order
    const offer = product.getOffer();
    if (!offer) {
      return { success: false, error: "No offer available for this product" };
    }

    return new Promise((resolve) => {
      // Set up one-time handlers for this purchase
      const purchaseHandler = store.when()
        .approved((transaction: any) => {
          if (transaction.products.some((p: any) => p.id === productId)) {
            console.log("StoreKit: Purchase approved", productId);
          }
        })
        .verified((receipt: any) => {
          const matchingTransaction = receipt.transactions?.find(
            (t: any) => t.products?.some((p: any) => p.id === productId)
          );
          if (matchingTransaction) {
            resolve({
              success: true,
              productId,
              transactionId: matchingTransaction.transactionId,
              receipt: receipt.nativeData?.appStoreReceipt,
            });
          }
        })
        .cancelled((transaction: any) => {
          if (transaction.products?.some((p: any) => p.id === productId)) {
            resolve({ success: false, error: "Achat annulé" });
          }
        });

      // Initiate the purchase
      offer.order()
        .then(() => {
          console.log("StoreKit: Order placed for", productId);
        })
        .catch((error: any) => {
          console.error("StoreKit: Order failed", error);
          resolve({ 
            success: false, 
            error: error.message || "Purchase failed" 
          });
        });

      // Timeout after 2 minutes
      setTimeout(() => {
        resolve({ success: false, error: "Purchase timeout" });
      }, 120000);
    });
  } catch (error: any) {
    console.error("StoreKit: Purchase error:", error);
    
    if (error.message?.includes("cancelled") || error.code === "E_USER_CANCELLED") {
      return { success: false, error: "Achat annulé" };
    }
    
    return { success: false, error: error.message || "Purchase failed" };
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<{ success: boolean; restoredProducts: string[]; error?: string }> => {
  if (!isNative || !isIOS) {
    return { success: false, restoredProducts: [], error: "StoreKit only available on iOS" };
  }

  if (!_storeInitialized) {
    return { success: false, restoredProducts: [], error: "StoreKit not initialized" };
  }

  try {
    const store = await getStoreModule();
    if (!store) {
      return { success: false, restoredProducts: [], error: "Store not available" };
    }

    const restoredProducts: string[] = [];
    
    return new Promise((resolve) => {
      store.when()
        .verified((receipt: any) => {
          receipt.transactions?.forEach((t: any) => {
            t.products?.forEach((p: any) => {
              if (!restoredProducts.includes(p.id)) {
                restoredProducts.push(p.id);
              }
            });
          });
        });

      store.restorePurchases()
        .then(() => {
          console.log("StoreKit: Restore completed", restoredProducts);
          resolve({ success: true, restoredProducts });
        })
        .catch((error: any) => {
          console.error("StoreKit: Restore failed", error);
          resolve({ 
            success: false, 
            restoredProducts, 
            error: error.message || "Restore failed" 
          });
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve({ success: true, restoredProducts });
      }, 30000);
    });
  } catch (error: any) {
    console.error("StoreKit: Restore error:", error);
    return { success: false, restoredProducts: [], error: error.message || "Restore failed" };
  }
};

// Check if StoreKit is available
export const isStoreKitAvailable = (): boolean => {
  return isNative && isIOS && _storeInitialized;
};

// Get active subscriptions
export const getActiveSubscriptions = async (): Promise<string[]> => {
  if (!_storeInitialized) return [];

  try {
    const store = await getStoreModule();
    if (!store) return [];

    const activeSubscriptions: string[] = [];
    
    [SUBSCRIPTION_PRODUCT_IDS.gold, SUBSCRIPTION_PRODUCT_IDS.platinum].forEach(productId => {
      const product = store.get(productId);
      if (product?.owned) {
        activeSubscriptions.push(productId);
      }
    });

    return activeSubscriptions;
  } catch (error) {
    console.error("StoreKit: Error getting active subscriptions:", error);
    return [];
  }
};

// Get subscription tier from active subscriptions
export const getSubscriptionTier = (activeSubscriptions: string[]): "free" | "premium" | "vip" => {
  if (activeSubscriptions.includes(SUBSCRIPTION_PRODUCT_IDS.platinum)) {
    return "vip";
  }
  if (activeSubscriptions.includes(SUBSCRIPTION_PRODUCT_IDS.gold)) {
    return "premium";
  }
  return "free";
};
