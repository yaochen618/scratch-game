"use client";

import { useState } from "react";

export default function MerchantActions({
  merchantId,
  isActive,
}: {
  merchantId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/merchants/toggle-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          isActive: !isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "操作失敗");
        return;
      }

      location.reload();
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMerchant() {
    if (!confirm("確定要刪除這個帳號嗎？此操作不可復原")) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/merchants/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "刪除失敗");
        return;
      }

      location.reload();
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {/* 停用 / 啟用 */}
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`rounded-xl px-3 py-1 text-sm ${
          isActive
            ? "border border-yellow-400 text-yellow-600"
            : "border border-green-400 text-green-600"
        }`}
      >
        {isActive ? "停用" : "啟用"}
      </button>

      {/* 刪除 */}
      <button
        onClick={deleteMerchant}
        disabled={loading}
        className="rounded-xl border border-red-400 px-3 py-1 text-sm text-red-600"
      >
        刪除
      </button>
    </div>
  );
}