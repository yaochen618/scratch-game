import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Store = {
  id: string;
  name: string;
  slug: string;
  announcement: string | null;
  is_active: boolean | null;
};

export default async function StoresPage() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, announcement, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-red-600">讀取商店失敗</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-black">商店列表</h1>

        {!stores || stores.length === 0 ? (
          <div className="rounded-2xl border bg-gray-50 p-6 text-gray-500">
            目前沒有可顯示的商店
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: Store) => (
              <Link
                key={store.id}
                href={`/stores/${store.slug}`}
                className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h2 className="text-xl font-bold text-black">{store.name}</h2>
                <p className="mt-2 text-sm text-gray-500">代碼：{store.slug}</p>

                {store.announcement ? (
                  <p className="mt-3 line-clamp-3 text-sm text-gray-700">
                    公告：{store.announcement}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">目前沒有公告</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}