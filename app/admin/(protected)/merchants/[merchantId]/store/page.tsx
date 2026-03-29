import { supabase } from "@/lib/supabase";
import Link from "next/link";
import BindStoresForm from "./bind-stores-form";

type PageProps = {
  params: Promise<{
    merchantId: string;
  }>;
};

export default async function MerchantStoresPage({ params }: PageProps) {
  const { merchantId } = await params;

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("id, name, email")
    .eq("id", merchantId)
    .single();

  if (merchantError || !merchant) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">找不到商家</h1>
          <Link
            href="/admin/merchants"
            className="mt-4 inline-block rounded-lg border px-4 py-2"
          >
            返回商家管理
          </Link>
        </div>
      </main>
    );
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active")
    .order("created_at", { ascending: false });

  const { data: bindings, error: bindingsError } = await supabase
    .from("merchant_store_bindings")
    .select("store_id")
    .eq("merchant_id", merchantId);

  if (storesError || bindingsError) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">載入失敗</h1>
          <p className="mt-2 text-red-600">
            {storesError?.message || bindingsError?.message}
          </p>
        </div>
      </main>
    );
  }

  const selectedStoreIds = (bindings ?? []).map((item) => item.store_id);

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">綁定店家</h1>
            <p className="mt-2 text-sm text-gray-600">
              商家：{merchant.name}（{merchant.email}）
            </p>
          </div>

          <Link
            href="/admin/merchants"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            返回商家管理
          </Link>
        </div>

        <BindStoresForm
          merchantId={merchantId}
          stores={stores ?? []}
          selectedStoreIds={selectedStoreIds}
        />
      </div>
    </main>
  );
}