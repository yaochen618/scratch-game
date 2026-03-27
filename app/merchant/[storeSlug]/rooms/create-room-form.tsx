"use client";

import { useState } from "react";

type Props = {
  storeSlug: string;
};

export default function CreateRoomForm({ storeSlug }: Props) {
  const [name, setName] = useState("");
  const [cellCount, setCellCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/stores/${storeSlug}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          cell_count: cellCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "建立刮板失敗");
        return;
      }

      setName("");
      setCellCount(30);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setErrorMsg("建立刮板失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-4 shadow-sm"
    >
      <h2 className="text-black mb-3 text-lg font-bold">新增刮板</h2>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-600">
          房間名稱
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="請輸入房間名稱"
          className="w-full text-black rounded-xl border px-3 py-2 outline-none focus:border-black"
          disabled={loading}
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-600">
          格數
        </label>
        <select
          value={cellCount}
          onChange={(e) => setCellCount(Number(e.target.value))}
          className="w-full text-black rounded-xl border px-3 py-2 outline-none focus:border-black"
          disabled={loading}
        >
          <option value={6}>6 格</option>
          <option value={9}>9 格</option>
          <option value={15}>15 格</option>
          <option value={20}>20 格</option>
          <option value={25}>25 格</option>
          <option value={30}>30 格</option>
          <option value={40}>40 格</option>
          <option value={50}>50 格</option>
          <option value={60}>60 格</option>
          <option value={100}>100 格</option>
          <option value={120}>120 格</option>
          <option value={200}>200 格</option>
        </select>
      </div>

      {errorMsg && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "建立中..." : "建立刮板"}
      </button>
    </form>
  );
}