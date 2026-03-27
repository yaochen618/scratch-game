import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";


type PageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export default async function MerchantStorePage({ params }: PageProps) {
  const { storeSlug } = await params;

  const cookieStore = await cookies();
  const merchantId = cookieStore.get("merchant_session")?.value;

  if (!merchantId) {
    redirect("/merchant/login");
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("slug", storeSlug)
    .eq("merchant_id", merchantId)
    .single();

  if (error || !store) {
    return (
      <main className="min-h-screen bg-blue-200 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900">
            找不到商家或你沒有權限
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/merchant" className="text-sm text-gray-500 hover:text-black">
            ← 回商家入口
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {store.name} 管理頁
          </h1>
          <p className="mb-8 text-gray-500">商家代號：{store.slug}</p>

          <Link
            href={`/merchant/${store.slug}/rooms`}
            className="inline-block rounded-xl bg-black px-4 py-2 text-white"
          >
            進入房間管理
          </Link>
        </div>
      </div>
    </main>
  );
}