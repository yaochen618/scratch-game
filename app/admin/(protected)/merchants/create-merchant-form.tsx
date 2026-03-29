"use client";

import { useState } from "react";

export default function CreateMerchantForm() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateMerchant(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/merchants/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName,
          username,
          password,
          storeSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "建立失敗");
        return;
      }

      setMsg("建立成功，頁面即將更新");
      setDisplayName("");
      setUsername("");
      setPassword("");
      setStoreSlug("");

      window.location.reload();
    } catch {
      setMsg("建立失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">新增商家帳號</h2>

      <form onSubmit={handleCreateMerchant} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            商家名稱
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
            placeholder="例如：台中一店"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            登入帳號
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
            placeholder="例如：taichung_store_01"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 text-black">
            登入密碼
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
            placeholder="請輸入密碼"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 text-black">
            綁定店家 slug
          </label>
          <input
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
            placeholder="例如：demo-store"
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
          className="rounded-xl bg-black px-4 py-2 font-medium text-white"
        >
          {loading ? "建立中..." : "建立商家帳號"}
        </button>
      </form>
    </section>
  );
}