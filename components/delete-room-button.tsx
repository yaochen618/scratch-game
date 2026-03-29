"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  storeSlug: string;
  roomSlug: string;
  roomName: string;
};

export default function DeleteRoomButton({
  storeSlug,
  roomSlug,
  roomName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(`確定要刪除「${roomName}」嗎？此動作無法復原。`);
    if (!ok) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/stores/${storeSlug}/rooms/${roomSlug}/delete`,
        {
          method: "POST",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "刪除失敗");
        return;
      }

      alert("刪除成功");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow disabled:opacity-50"
    >
      {loading ? "刪除中..." : "刪除"}
    </button>
  );
}