"use client";

import { useState } from "react";

export default function ResetPasswordButton({
  merchantId,
}: {
  merchantId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const newPassword = prompt("請輸入新密碼");

    if (!newPassword) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/merchants/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "重設失敗");
        return;
      }

      alert("密碼已更新");
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="rounded-xl border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
    >
      {loading ? "處理中..." : "重設密碼"}
    </button>
  );
}