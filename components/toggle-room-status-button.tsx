"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  storeSlug: string;
  roomSlug: string;
  currentStatus: string;
  roomName: string;
};

export default function ToggleRoomStatusButton({
  storeSlug,
  roomSlug,
  currentStatus,
  roomName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStatus = currentStatus === "active" ? "draft" : "active";

  async function handleToggle() {
    const actionText = nextStatus === "active" ? "開放" : "關閉";
    const ok = window.confirm(`確定要${actionText}「${roomName}」嗎？`);

    if (!ok) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/stores/${storeSlug}/rooms/${roomSlug}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "切換狀態失敗");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("系統錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
        currentStatus === "active" ? "bg-orange-500" : "bg-blue-600"
      }`}
    >
      {loading
        ? "處理中..."
        : currentStatus === "active"
        ? "關閉刮板"
        : "開放刮板"}
    </button>
  );
}