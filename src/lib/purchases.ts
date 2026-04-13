import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

export const PREMIUM_ENTITLEMENT = 'premium';
export const PREMIUM_OFFERING = 'premium_monthly';

/**
 * Initialize RevenueCat – call on app startup after user is identified
 */
export async function initializePurchases(userId?: string): Promise<void> {
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  await Purchases.configure({ apiKey });
  if (userId) {
    await Purchases.logIn(userId);
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

/**
 * Get available offerings/packages
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? offerings.all[PREMIUM_OFFERING] ?? null;
  } catch (error) {
    console.error('RevenueCat getOfferings error:', error);
    return null;
  }
}

/**
 * Purchase premium subscription
 * Returns true on success, false/error string on failure
 */
export async function purchasePremium(packageToPurchase: any): Promise<true | string> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    const isPremium = checkIsPremium(customerInfo);

    if (isPremium) {
      // Sync premium status to Supabase
      await syncPremiumStatus(customerInfo);
      return true;
    }
    return 'Købet lykkedes ikke. Prøv igen.';
  } catch (error: any) {
    if (error?.userCancelled) return 'Køb annulleret.';
    return error?.message ?? 'Ukendt fejl ved køb.';
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = checkIsPremium(customerInfo);
    if (isPremium) {
      await syncPremiumStatus(customerInfo);
    }
    return isPremium;
  } catch (error) {
    console.error('Restore purchases error:', error);
    return false;
  }
}

/**
 * Check if user has active premium entitlement
 */
export function checkIsPremium(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/**
 * Sync RevenueCat premium status to Supabase profile
 */
export async function syncPremiumStatus(customerInfo: CustomerInfo): Promise<void> {
  const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
  const isPremium = !!entitlement;
  const expiresAt = entitlement?.expirationDate ?? null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({
      is_premium: isPremium,
      premium_expires_at: expiresAt,
      revenuecat_customer_id: customerInfo.originalAppUserId,
    })
    .eq('id', user.id);
}

/**
 * Log out from RevenueCat (call on user logout)
 */
export async function logOutPurchases(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch {
    // Ignore errors on logout
  }
}
