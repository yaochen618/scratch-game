import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getRemainingDays,
  isMerchantExpired,
  isMerchantPlanAvailable,
} from "@/lib/merchant-plan";

export default async function MerchantPage() {
  const cookieStore = await cookies();
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
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          找不到商家資料
        </div>
      </main>
    );
  }

  const canUse = isMerchantPlanAvailable({
    is_active: merchant.is_active,
    billing_status: merchant.billing_status,
    expires_at: merchant.expires_at,
  });

  if (!canUse) {
    redirect("/merchant/expired");
  }

  const remainingDays = getRemainingDays(merchant.expires_at);
  const expired = isMerchantExpired(merchant.expires_at);
  const showWarning = !expired && remainingDays <= 3;

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active")
    .eq("merchant_id", merchant.id)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-blue-200 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl text-black font-bold">商家後台</h1>
        <p className="mt-2 text-gray-900">歡迎，{merchant.display_name}</p>

        {showWarning && (
          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
            你的方案將於 {remainingDays} 天內到期，請儘快續約。
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-white p-4">
          <h2 className="mb-4 text-lg text-black font-semibold">已綁定店家</h2>

          {storesError ? (
            <div className="text-red-600">{storesError.message}</div>
          ) : !stores || stores.length === 0 ? (
            <div className="text-gray-500">目前沒有綁定任何店家</div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <div key={store.id} className="rounded-lg border bg-gray-100 px-4 py-3">
                  <div className="font-medium text-gray-500">{store.name}</div>
                  <div className="text-sm text-gray-500">{store.slug}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {store.is_active ? "啟用中" : "已停用"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/merchant/${store.slug}`}
                      className="rounded-lg bg-black px-4 py-2 text-sm text-white"
                    >
                      進入管理
                    </Link>

                    <Link
                      href={`/merchant/${store.slug}/rooms`}
                      className="rounded-lg border bg-white text-black px-4 py-2 text-sm"
                    >
                      管理房間
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}