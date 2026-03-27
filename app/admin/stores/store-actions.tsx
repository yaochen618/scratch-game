"use client";

import { useState } from "react";

type MerchantOption = {
  id: string;
  display_name: string;
  username: string;
};

export default function StoreActions({
  storeId,
  currentMerchantId,
  merchants,
}: {
  storeId: string;
  currentMerchantId: string | null;
  merchants: MerchantOption[];
}) {
  const [merchantId, setMerchantId] = useState(currentMerchantId || "");
  const [loading, setLoading] = useState(false);

  async function handleUpdateMerchant() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/stores/update-merchant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          merchantId: merchantId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "更新失敗");
        return;
      }

      alert("綁定已更新");
      window.location.reload();
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStore() {
    const ok = confirm("確定要刪除這間商店嗎？此操作不可復原。");
    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/stores/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "刪除失敗");
        return;
      }

      alert("商店已刪除");
      window.location.reload();
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={merchantId}
        onChange={(e) => setMerchantId(e.target.value)}
        disabled={loading}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-black"
      >
        <option value="">未綁定</option>
        {merchants.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.display_name}（{merchant.username}）
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          onClick={handleUpdateMerchant}
          disabled={loading}
          className="rounded-xl border border-blue-400 px-3 py-1 text-sm text-blue-600"
        >
          儲存綁定
        </button>

        <button
          onClick={handleDeleteStore}
          disabled={loading}
          className="rounded-xl border border-red-400 px-3 py-1 text-sm text-red-600"
        >
          刪除商店
        </button>
      </div>
    </div>
  );
}