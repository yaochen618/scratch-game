"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type Props = {
  merchantId: string;
  stores: Store[];
  selectedStoreIds: string[];
};

export default function BindStoresForm({
  merchantId,
  stores,
  selectedStoreIds,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(selectedStoreIds);
  const [saving, setSaving] = useState(false);

  function toggleStore(storeId: string) {
    setSelected((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  }

  async function handleSave() {
    try {
      setSaving(true);

      const res = await fetch(`/api/admin/merchants/${merchantId}/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeIds: selected,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "儲存失敗");
        return;
      }

      alert("綁定成功");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 text-sm text-gray-600">
          勾選這個商家可以管理的店家
        </div>

        <div className="space-y-3">
          {stores.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
              目前沒有店家資料
            </div>
          ) : (
            stores.map((store) => (
              <label
                key={store.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium">{store.name}</div>
                  <div className="text-sm text-gray-500">
                    slug：{store.slug}
                  </div>
                  <div className="text-sm text-gray-500">
                    狀態：{store.is_active ? "啟用中" : "停用中"}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={selected.includes(store.id)}
                  onChange={() => toggleStore(store.id)}
                  className="h-5 w-5"
                />
              </label>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {saving ? "儲存中..." : "儲存綁定"}
      </button>
    </div>
  );
}