import { createClient } from "@supabase/supabase-js";
import { isMerchantPlanAvailable } from "@/lib/merchant-plan";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requireUsableStoreBySlug(storeSlug: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, is_active, expires_at, plan_type")
    .eq("slug", storeSlug)
    .single();

  if (error || !store) {
    return {
      ok: false as const,
      status: 404,
      error: "找不到商家",
      store: null,
    };
  }

  const isAvailable = isMerchantPlanAvailable(store);

  if (!isAvailable) {
    return {
      ok: false as const,
      status: 403,
      error: "方案不可用或已到期",
      store: null,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    store,
  };
}