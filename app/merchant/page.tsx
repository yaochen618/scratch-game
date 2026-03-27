import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/logout-button";

type Store = {
  id: string;
  name: string;
  slug: string;
};

export default async function MerchantPage() {
  const cookieStore = await cookies();
  const merchantId = cookieStore.get("merchant_session")?.value;

  if (!merchantId) {
    redirect("/merchant/login");
  }

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("merchant_id", merchantId)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">商家入口頁</h1>
            <p className="text-gray-600">請選擇要管理的商家</p>
          </div>

          <LogoutButton />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            讀取商家失敗：{error.message}
          </div>
        )}

        {!error && (!stores || stores.length === 0) ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-500">
            目前沒有可管理的商家資料
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores?.map((store: Store) => (
              <div
                key={store.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  {store.name}
                </h2>

                <p className="mb-4 text-sm text-gray-500">slug：{store.slug}</p>

                <Link
                  href={`/merchant/${store.slug}`}
                  className="inline-block rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  進入管理
                </Link>

                <Link
                  href={`/admin/stores/${store.slug}/rooms`}
                  className="mt-2 inline-block rounded bg-blue-500 px-4 py-2 text-sm text-white"
                >
                  管理房間
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}