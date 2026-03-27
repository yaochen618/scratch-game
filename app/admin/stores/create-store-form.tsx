"use client";

import { useState } from "react";

type MerchantOption = {
  id: string;
  display_name: string;
  username: string;
};

export default function CreateStoreForm({
  merchants,
}: {
  merchants: MerchantOption[];
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
          merchantId: merchantId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "建立失敗");
        return;
      }

      setMsg("商店建立成功");
      setName("");
      setSlug("");
      setMerchantId("");

      window.location.reload();
    } catch {
      setMsg("建立失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">新增商店</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            商店名稱
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
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
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
            placeholder="例如：taichung-store-1"
          />
          <p className="mt-1 text-xs text-gray-400">
            建議使用英文字母、數字、-，之後網址會用到
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 text-black">
            綁定商家帳號（可不選）
          </label>
          <select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="w-full rounded-xl border border-gray-300 text-black px-4 py-2"
          >
            <option value="">先不綁定</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.display_name}（{merchant.username}）
              </option>
            ))}
          </select>
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
          {loading ? "建立中..." : "建立商店"}
        </button>
      </form>
    </section>
  );
}