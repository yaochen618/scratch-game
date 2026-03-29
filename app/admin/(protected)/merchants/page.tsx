import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateMerchantForm from "./create-merchant-form";
import ResetPasswordButton from "./reset-password-button";
import MerchantActions from "./merchant-actions";
import RenewPlanButton from "./renew-plan-button";

type MerchantRow = {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
};

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  merchant_id: string | null;
};

export default async function AdminMerchantsPage() {
  const { data: merchants, error: merchantsError } = await supabase
    .from("merchant_accounts")
    .select("id, username, display_name, is_active, created_at, expires_at")
    .order("created_at", { ascending: false });

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, merchant_id")
    .order("name", { ascending: true });

  const storeMap = new Map<string, StoreRow[]>();

  (stores || []).forEach((store: StoreRow) => {
    if (!store.merchant_id) return;
    const current = storeMap.get(store.merchant_id) || [];
    current.push(store);
    storeMap.set(store.merchant_id, current);
  });

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
          <h1 className="mb-2 text-3xl font-bold text-gray-900">商家帳號管理</h1>
          <p className="text-gray-600">建立商家帳號、查看綁定店家與帳號狀態</p>
        </div>

        <div className="mb-10">
          <CreateMerchantForm />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">商家帳號列表</h2>

          {(merchantsError || storesError) && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              讀取資料失敗：{merchantsError?.message || storesError?.message}
            </div>
          )}

          {!merchantsError && (!merchants || merchants.length === 0) ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-gray-500">
              目前還沒有商家帳號
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-2">商家名稱</th>
                    <th className="px-4 py-2">登入帳號</th>
                    <th className="px-4 py-2">狀態</th>
                    <th className="px-4 py-2">綁定店家</th>
                    <th className="px-4 py-2">租約</th>
                    <th className="px-4 py-2">建立時間</th>
                    <th className="px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants?.map((merchant: MerchantRow) => {
                    const bindStores = storeMap.get(merchant.id) || [];

                    return (
                      <tr
                        key={merchant.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {merchant.display_name}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {merchant.username}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              merchant.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {merchant.is_active ? "啟用中" : "已停用"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {bindStores.length === 0 ? (
                            <span className="text-gray-400">未綁定店家</span>
                          ) : (
                            <div className="space-y-1">
                              {bindStores.map((store) => (
                                <div key={store.id}>
                                  {store.name}
                                  <span className="ml-2 text-sm text-gray-400">
                                    ({store.slug})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm">
                          {(() => {
                            if (!merchant.expires_at) {
                              return <span className="text-gray-400">未設定</span>;
                            }

                            const expireDate = new Date(merchant.expires_at);
                            const now = new Date();
                            const diff = Math.ceil(
                              (expireDate.getTime() - now.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );

                            if (diff < 0) {
                              return (
                                <div className="font-semibold text-red-600">
                                  已過期
                                  <div className="text-xs font-normal text-gray-500">
                                    {expireDate.toLocaleDateString("zh-TW")}
                                  </div>
                                </div>
                              );
                            }

                            if (diff <= 3) {
                              return (
                                <div className="font-semibold text-orange-600">
                                  剩 {diff} 天
                                  <div className="text-xs font-normal text-gray-500">
                                    {expireDate.toLocaleDateString("zh-TW")}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="text-green-700">
                                剩 {diff} 天
                                <div className="text-xs text-gray-500">
                                  {expireDate.toLocaleDateString("zh-TW")}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {new Date(merchant.created_at).toLocaleString("zh-TW")}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/admin/merchants/${merchant.id}/bind-store`}
                              className="inline-block rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                              綁定店家
                            </Link>

                            <RenewPlanButton merchantId={merchant.id} />

                            <ResetPasswordButton merchantId={merchant.id} />

                            <MerchantActions
                              merchantId={merchant.id}
                              isActive={merchant.is_active}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}