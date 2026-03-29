"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  storeSlug: string;
  roomSlug: string;
  roomName: string;
};

export default function ResetRoomButton({
  storeSlug,
  roomSlug,
  roomName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const ok = window.confirm(
      `確定要重製房間「${roomName}」嗎？目前刮取進度會被清空。`
    );

    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/stores/${storeSlug}/rooms/${roomSlug}/reset`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "重製失敗");
        return;
      }

      alert(data.message || "重製成功");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("重製失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={loading}
      className="rounded-lg border px-3 py-2 text-sm text-black font-medium"
    >
      {loading ? "重製中..." : "重製"}
    </button>
  );
}