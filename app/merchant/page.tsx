import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/logout-button";
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

  const staffId =
    cookieStore.get("staff_session")?.value;
    console.log("merchantId =", merchantId);
    console.log("staffId =", staffId);

  if (!merchantId && !staffId) {
    redirect("/merchant/login");
  }

  // ===========================
  // 特殊身分模式
  // ===========================
  if (staffId && !merchantId) {
    console.log("進入特殊管理員模式");
    const { data: staff } = await supabase
      .from("store_staff")
      .select(
        "id, username, store_id, can_manage_special_rules, can_manage_special_mode"
      )
      .eq("id", staffId)
      .single();

    if (!staff) {
      redirect("/merchant/login");
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id,name,slug,is_active")
      .eq("id", staff.store_id)
      .single();

    return (
      <main className="min-h-screen bg-blue-200 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-black">
              特殊管理員後台
            </h1>

            <LogoutButton />
          </div>

          <p className="mt-2 text-gray-900">
            歡迎，{staff.username}
          </p>

          <div className="mt-8 rounded-xl border bg-white p-4">
            <h2 className="mb-4 text-lg font-semibold text-black">
              可管理店家
            </h2>

            <div className="rounded-lg border bg-gray-100 px-4 py-3">
              <div className="font-medium text-gray-700">
                {store?.name}
              </div>

              <div className="text-sm text-gray-500">
                {store?.slug}
              </div>

              <div className="mt-1 text-sm text-gray-500">
                {store?.is_active ? "啟用中" : "已停用"}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/merchant/${store?.slug}/rooms`}
                  className="rounded-lg border bg-white px-4 py-2 text-sm text-black"
                >
                  管理房間
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ===========================
  // 一般商家模式
  // ===========================

  const { data: merchant, error } = await supabase
    .from("merchant_accounts")
    .select(
      "id, username, display_name, is_active, billing_status, expires_at"
    )
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

  const remainingDays = getRemainingDays(
    merchant.expires_at
  );

  const expired = isMerchantExpired(
    merchant.expires_at
  );

  const showWarning =
    !expired && remainingDays <= 3;

  const { data: stores, error: storesError } =
    await supabase
      .from("stores")
      .select("id, name, slug, is_active")
      .eq("merchant_id", merchant.id)
      .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-blue-200 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">
            商家後台
          </h1>

          <LogoutButton />
        </div>

        <p className="mt-2 text-gray-900">
          歡迎，{merchant.display_name}
        </p>

        {showWarning && (
          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
            你的方案將於 {remainingDays} 天內到期，請儘快續約。
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-black">
            已綁定店家
          </h2>

          {storesError ? (
            <div className="text-red-600">
              {storesError.message}
            </div>
          ) : !stores || stores.length === 0 ? (
            <div className="text-gray-500">
              目前沒有綁定任何店家
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-lg border bg-gray-100 px-4 py-3"
                >
                  <div className="font-medium text-gray-700">
                    {store.name}
                  </div>

                  <div className="text-sm text-gray-500">
                    {store.slug}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {store.is_active
                      ? "啟用中"
                      : "已停用"}
                  </div>

                  <div className="mt-3">
                    <Link
                      href={`/merchant/${store.slug}/rooms`}
                      className="rounded-lg border bg-white px-4 py-2 text-sm text-black"
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