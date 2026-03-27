"use client";

import { useState } from "react";

type Props = {
  storeSlug: string;
  initialAnnouncement: string | null;
};

export default function AnnouncementEditor({
  storeSlug,
  initialAnnouncement,
}: Props) {
  const [announcement, setAnnouncement] = useState(initialAnnouncement ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/stores/${storeSlug}/announcement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcement }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "儲存失敗");
        return;
      }

      setMessage("公告已更新");
    } catch (error) {
      console.error(error);
      setMessage("發生錯誤，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-gray-900">公告</h2>

      <textarea
        value={announcement}
        onChange={(e) => setAnnouncement(e.target.value)}
        placeholder="請輸入公告，例如：1. 活動優惠 2. 抽獎規則說明"
        rows={6}
        className="w-full text-gray-500 rounded-xl border border-gray-500 p-3 text-sm outline-none focus:border-black"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "儲存中..." : "儲存公告"}
        </button>

        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </section>
  );
}