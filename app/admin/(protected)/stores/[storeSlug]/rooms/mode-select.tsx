"use client";

import { useState } from "react";

type Props = {
  roomId: string;
  currentMode: string;
};

export default function ModeSelect({ roomId, currentMode }: Props) {
  const [mode, setMode] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  async function handleChange(nextMode: string) {
    setMode(nextMode);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/mode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draw_mode: nextMode }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "更新失敗");
        setMode(currentMode);
        return;
      }
    } catch {
      alert("更新失敗");
      setMode(currentMode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={mode}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="rounded border px-3 py-2 text-sm text-black"
    >
      <option value="uniform">一般模式</option>
      <option value="special">特殊模式</option>
    </select>
  );
}