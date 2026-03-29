import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BindStoreForm from "./bind-store-form";

type PageProps = {
  params: Promise<{
    merchantId: string;
  }>;
};

export default async function BindStorePage({ params }: PageProps) {
  const { merchantId } = await params;

  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_accounts")
    .select("id, username, display_name")
    .eq("id", merchantId)
    .single();

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, merchant_id, is_active")
    .order("name", { ascending: true });

  if (merchantError || !merchant) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-red-600">找不到商家</h1>
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

  if (storesError) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-red-600">讀取店家失敗</h1>
          <p className="mt-2 text-gray-600">{storesError.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/admin/merchants"
            className="inline-block rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            ← 返回商家管理
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">綁定店家</h1>
          <p className="mt-2 text-gray-600">
            商家：{merchant.display_name}（{merchant.username}）
          </p>
        </div>

        <BindStoreForm
          merchantId={merchant.id}
          stores={stores ?? []}
        />
      </div>
    </main>
  );
}