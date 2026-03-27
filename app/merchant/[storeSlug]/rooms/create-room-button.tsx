"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  storeSlug: string;
};

export default function CreateRoomButton({ storeSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const name = window.prompt("請輸入刮板名稱");
    if (!name) return;

    const slug = window.prompt("請輸入刮板代稱 slug（例如 board-2）");
    if (!slug) return;

    const drawMode =
      window.prompt("請輸入模式：uniform 或 special", "uniform") || "uniform";

    try {
      setLoading(true);

      const res = await fetch(`/api/stores/${storeSlug}/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          draw_mode: drawMode,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "建立失敗");
        return;
      }

      alert("建立成功");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("建立失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={loading}
      className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow disabled:opacity-50"
    >
      {loading ? "建立中..." : "＋ 新增刮板"}
    </button>
  );
}