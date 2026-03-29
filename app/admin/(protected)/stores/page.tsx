import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRemainingDays, isMerchantExpired } from "@/lib/merchant-plan";
import DeleteStoreButton from "./delete-store-button";
import CreateStoreForm from "./create-store-form";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  merchant_id: string | null;
  plan_type: string | null;
  is_active: boolean | null;
  billing_status?: string | null;
  expires_at: string | null;
};

export default async function AdminStoresPage() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select(
      "id, name, slug, merchant_id, plan_type, is_active, billing_status, expires_at"
    )
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-block rounded-lg bg-gray-900 px-4 py-2 text-white transition hover:bg-black"
          >
            ← 返回管理員總後台
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">商店管理</h1>
          <p className="text-gray-600">
            查看商店、建立商店、管理房間與查看租約時間
          </p>
        </div>

        <CreateStoreForm />

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">商店列表</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              讀取資料失敗：{error.message}
            </div>
          )}

          {!error && (!stores || stores.length === 0) ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-gray-500">
              目前還沒有商店
            </div>
          ) : (
            <div className="space-y-4">
              {stores?.map((store: StoreRow) => {
                const isExpired = isMerchantExpired(store);
                const remainingDays = getRemainingDays(store);

                return (
                  <div
                    key={store.id}
                    className={`rounded-xl border p-4 ${
                      isExpired
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">
                      {store.name}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      slug：{store.slug}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      方案：{store.plan_type ?? "未設定"}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      狀態：{store.is_active ? "啟用中" : "停用"}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      帳務狀態：{store.billing_status ?? "未設定"}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      租約到期時間：
                      {store.expires_at
                        ? new Date(store.expires_at).toLocaleString("zh-TW", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })
                        : "未設定"}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      剩餘天數：{remainingDays} 天
                    </div>

                    {isExpired && (
                      <div className="mt-2 text-sm font-semibold text-red-600">
                        ⚠ 此商店租約已過期
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/stores/${store.slug}/rooms`}
                        className="inline-block rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
                      >
                        管理房間
                      </Link>

                      <DeleteStoreButton storeId={String(store.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}