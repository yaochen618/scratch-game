"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomForm({
  storeSlug,
}: {
  storeSlug: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [cellCount, setCellCount] = useState("30");
  const [prizeNumbers, setPrizeNumbers] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const count = Number(cellCount);

    if (!name.trim()) {
      setMessage("請輸入房間名稱");
      return;
    }

    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      setMessage("格數必須介於 1 ~ 1000");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`/api/stores/${storeSlug}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          cellCount: count,
          prize_numbers: prizeNumbers.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "建立失敗");
        return;
      }

      setMessage("房間建立成功");
      setName("");
      setCellCount("30");
      setPrizeNumbers("");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("發生錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-4 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-bold text-gray-900">建立房間</h2>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            房間名稱
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請輸入房間名稱"
            className="w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            格數
          </label>

          <input
            type="number"
            min="1"
            max="1000"
            value={cellCount}
            onChange={(e) => setCellCount(e.target.value)}
            placeholder="請輸入格數"
            className="w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            中獎號碼，可不填
          </label>

          <input
            value={prizeNumbers}
            onChange={(e) => setPrizeNumbers(e.target.value)}
            placeholder="例如：1,5,8,30"
            className="w-full rounded-xl border p-3 text-sm text-black outline-none focus:border-black"
          />

          <p className="mt-1 text-xs text-gray-500">
            多個號碼請用逗號分隔。沒填就不顯示中獎提示。
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "建立中..." : "建立房間"}
        </button>

        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </form>
  );
}