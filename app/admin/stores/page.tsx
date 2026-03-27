import { supabase } from "@/lib/supabase";
import CreateStoreForm from "./create-store-form";
import StoreActions from "./store-actions";

type MerchantRow = {
  id: string;
  display_name: string;
  username: string;
};

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  merchant_id: string | null;
};

export default async function AdminStoresPage() {
  const { data: merchants, error: merchantsError } = await supabase
    .from("merchant_accounts")
    .select("id, display_name, username")
    .order("display_name", { ascending: true });

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, merchant_id")
    .order("name", { ascending: true });

  const merchantMap = new Map<string, MerchantRow>();
  (merchants || []).forEach((merchant: MerchantRow) => {
    merchantMap.set(merchant.id, merchant);
  });

  return (
    <main className="min-h-screen bg-green-300 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">商店管理</h1>
          <p className="text-gray-600">建立商店、調整綁定商家與刪除商店</p>
        </div>

        <div className="mb-10">
          <CreateStoreForm merchants={(merchants || []) as MerchantRow[]} />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">商店列表</h2>

          {(merchantsError || storesError) && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              讀取資料失敗：{merchantsError?.message || storesError?.message}
            </div>
          )}

          {!storesError && (!stores || stores.length === 0) ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-gray-500">
              目前還沒有商店
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-2">商店名稱</th>
                    <th className="px-4 py-2">slug</th>
                    <th className="px-4 py-2">目前綁定商家</th>
                    <th className="px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stores?.map((store: StoreRow) => {
                    const merchant = store.merchant_id
                      ? merchantMap.get(store.merchant_id)
                      : null;

                    return (
                      <tr
                        key={store.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {store.name}
                        </td>

                        <td className="px-4 py-4 text-gray-700">{store.slug}</td>

                        <td className="px-4 py-4 text-gray-700">
                          {merchant ? (
                            <span>
                              {merchant.display_name}
                              <span className="ml-2 text-sm text-gray-400">
                                ({merchant.username})
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">未綁定</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StoreActions
                            storeId={store.id}
                            currentMerchantId={store.merchant_id}
                            merchants={(merchants || []) as MerchantRow[]}
                          />
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