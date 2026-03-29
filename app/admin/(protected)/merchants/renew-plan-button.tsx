"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RenewPlanButton({
  merchantId,
}: {
  merchantId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRenew() {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/merchants/${merchantId}/renew`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "續約失敗");
        return;
      }

      alert("已續約 30 天");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRenew}
      disabled={loading}
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      {loading ? "續約中..." : "續約 30 天"}
    </button>
  );
}