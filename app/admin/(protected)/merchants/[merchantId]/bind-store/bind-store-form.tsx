"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  merchant_id: string | null;
  is_active: boolean;
};

export default function BindStoreForm({
  merchantId,
  stores,
}: {
  merchantId: string;
  stores: StoreRow[];
}) {
  const router = useRouter();

  const initialSelected = stores
    .filter((store) => store.merchant_id === merchantId)
    .map((store) => store.id);

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  }

  async function handleSave() {
    try {
      setSaving(true);

      const res = await fetch(`/api/admin/merchants/${merchantId}/bind-store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeIds: selectedStoreIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "儲存失敗");
        return;
      }

      alert("綁定成功");
      router.push("/admin/merchants");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        {stores.map((store) => {
          const checked = selectedStoreIds.includes(store.id);

          return (
            <label
              key={store.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium text-gray-900">{store.name}</div>
                <div className="text-sm text-gray-500">({store.slug})</div>
                <div className="text-xs text-gray-400">
                  {store.is_active ? "啟用中" : "已停用"}
                </div>
              </div>

              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleStore(store.id)}
                className="h-5 w-5"
              />
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {saving ? "儲存中..." : "儲存綁定"}
      </button>
    </div>
  );
}