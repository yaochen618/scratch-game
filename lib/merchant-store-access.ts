import { supabase } from "@/lib/supabase";
import { requireMerchantSession } from "./merchant-auth";

export async function requireMerchantStoreAccess(storeSlug: string) {
  const merchant = await requireMerchantSession();

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, merchant_id, is_active, announcement")
    .eq("slug", storeSlug)
    .eq("merchant_id", merchant.id)
    .single();

  if (error || !store) {
    return {
      merchant,
      store: null,
      error: "找不到商家或你沒有權限",
    };
  }

  return {
    merchant,
    store,
    error: null,
  };
}