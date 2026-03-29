"use client";

import { useState } from "react";

export default function CreateStoreForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/stores/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "建立失敗");
        return;
      }

      setMsg("建立成功，頁面即將更新");
      setName("");
      setSlug("");

      window.location.reload();
    } catch {
      setMsg("建立失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">新增商店</h2>

      <form onSubmit={handleCreateStore} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            商店名稱
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-black"
            placeholder="例如：台中一店"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            商店 slug
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-black"
            placeholder="例如：taichung-store-01"
          />
        </div>

        {msg && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "建立中..." : "建立商店"}
        </button>
      </form>
    </section>
  );
}