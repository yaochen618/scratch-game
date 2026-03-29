import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isMerchantPlanAvailable } from "@/lib/merchant-plan";

export async function requireMerchantSession() {
  const cookieStore = await cookies();

  // 先同時支援兩種 cookie 名稱，避免你前面改名造成舊頁面失效
  const merchantId =
    cookieStore.get("merchant_id")?.value ||
    cookieStore.get("merchant_session")?.value;

  if (!merchantId) {
    redirect("/merchant/login");
  }

  const { data: merchant, error } = await supabase
    .from("merchant_accounts")
    .select("id, username, display_name, is_active, billing_status, expires_at")
    .eq("id", merchantId)
    .single();

  if (error || !merchant) {
    redirect("/merchant/login");
  }

  const canUse = isMerchantPlanAvailable({
    is_active: merchant.is_active,
    billing_status: merchant.billing_status,
    expires_at: merchant.expires_at,
  });

  if (!canUse) {
    redirect("/merchant/expired");
  }

  return merchant;
}