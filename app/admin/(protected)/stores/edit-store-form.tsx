"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  storeId: string;
  initialName: string;
  initialSlug: string;
};

export default function EditStoreForm({
  storeId,
  initialName,
  initialSlug,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      alert("商店名稱不能空白");
      return;
    }

    if (!trimmedSlug) {
      alert("slug 不能空白");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/stores/${storeId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "更新失敗");
        return;
      }

      alert("更新成功");
      router.refresh();
    } catch (error) {
      alert("系統錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            商店名稱
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full text-black rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="請輸入商店名稱"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            slug
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={loading}
            className="w-full text-black rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="請輸入 slug"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "儲存中..." : "儲存名稱 / slug"}
        </button>
      </div>
    </div>
  );
}