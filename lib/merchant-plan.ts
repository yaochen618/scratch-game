export type MerchantPlanStore = {
  is_active: boolean | null;
  expires_at: string | null;
  billing_status?: string | null;
};

export function isMerchantPlanAvailable(store: MerchantPlanStore) {
  if (!store?.is_active) return false;

  if (store.billing_status && store.billing_status !== "active") {
    return false;
  }

  if (!store?.expires_at) return false;

  return new Date(store.expires_at).getTime() > Date.now();
}

export function isMerchantExpired(store: MerchantPlanStore) {
  if (!store?.expires_at) return true;

  return new Date(store.expires_at).getTime() <= Date.now();
}

export function getRemainingDays(store: MerchantPlanStore) {
  if (!store?.expires_at) return 0;

  const diff = new Date(store.expires_at).getTime() - Date.now();

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}