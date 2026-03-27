"use client";

import { useState } from "react";

export default function ModeSelect({
  roomId,
  currentMode,
}: {
  roomId: string;
  currentMode: string;
}) {
  const [mode, setMode] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/rooms/update-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          drawMode: mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "更新失敗");
        return;
      }

      alert("模式已更新");
    } catch {
      alert("發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="uniform">一般</option>
        <option value="special">特殊</option>
      </select>

      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-black px-3 py-1 text-sm text-white"
      >
        {loading ? "儲存中..." : "儲存"}
      </button>
    </div>
  );
}