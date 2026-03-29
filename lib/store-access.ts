import { createClient } from "@supabase/supabase-js";
import { isMerchantPlanAvailable } from "./merchant-plan";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function validateStorePublicAccess(storeSlug: string) {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active, merchant_id")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return { ok: false, status: 404, error: "找不到店家" };
  }

  if (!store.is_active) {
    return { ok: false, status: 403, error: "店家已停用" };
  }

  if (!store.merchant_id) {
    return { ok: false, status: 403, error: "店家尚未綁定商家" };
  }

  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_accounts")
    .select("id, is_active, billing_status, expires_at")
    .eq("id", store.merchant_id)
    .single();

  if (merchantError || !merchant) {
    return { ok: false, status: 500, error: "商家資料異常" };
  }

  const canUse = isMerchantPlanAvailable({
    is_active: merchant.is_active,
    billing_status: merchant.billing_status,
    expires_at: merchant.expires_at,
  });

  if (!canUse) {
    return { ok: false, status: 403, error: "商家方案已到期或不可用" };
  }

  return { ok: true, store, merchant };
}