import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isMerchantPlanAvailable } from "@/lib/merchant-plan";

type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function MerchantStorePage({ params }: PageProps) {
  const { storeSlug } = await params;

  const cookieStore = await cookies();
  const merchantId =
    cookieStore.get("merchant_id")?.value ||
    cookieStore.get("merchant_session")?.value;

  if (!merchantId) {
    redirect("/merchant/login");
  }

  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_accounts")
    .select("id, display_name, is_active, billing_status, expires_at")
    .eq("id", merchantId)
    .single();

  if (merchantError || !merchant) {
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

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active, announcement, merchant_id")
    .eq("slug", storeSlug)
    .eq("merchant_id", merchant.id)
    .single();

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          找不到商家或你沒有權限
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-200 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/merchant" className="rounded-lg border bg-white text-black px-4 py-2">
            ← 返回商家後台
          </Link>
        </div>

        <h1 className="text-2xl text-black font-bold">{store.name}</h1>
        <p className="mt-2 text-black">店家代號：{store.slug}</p>

        <div className="mt-6 rounded-xl border bg-white p-4">
          <div className="text-sm text-black">店家狀態</div>
          <div className="mt-1 text-yellow-500 font-medium">
            {store.is_active ? "啟用中" : "已停用"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href={`/merchant/${store.slug}/rooms`}
            className="rounded-xl border bg-white p-5 hover:bg-gray-50"
          >
            <div className="text-lg text-black font-semibold">房間管理</div>
            <div className="mt-2 text-sm text-gray-500">
              建立、刪除、重置房間
            </div>
          </Link>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-lg text-black font-semibold">公告內容</h2>
          <div className="whitespace-pre-wrap text-gray-400">
            {store.announcement || "目前沒有公告"}
          </div>
        </div>
      </div>
    </main>
  );
}