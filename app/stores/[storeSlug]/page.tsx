"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  slug: string;
  announcement?: string | null;
};

type Room = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawStoreSlug = params.storeSlug;
  const storeSlug = Array.isArray(rawStoreSlug) ? rawStoreSlug[0] : rawStoreSlug;

  const [store, setStore] = useState<Store | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        console.log("目前 storeSlug =", storeSlug);

        const res = await fetch(`/api/stores/${storeSlug}/rooms`, {
          cache: "no-store",
        });

        const text = await res.text();
        console.log("API 原始回傳 =", text);

        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch {
          setErrorMsg("伺服器回傳格式錯誤");
          return;
        }

        if (!res.ok) {
          console.error("API 錯誤 =", json);
          setErrorMsg(json.error || "讀取刮板失敗");
          return;
        }

        setStore(json.store || null);
        setRooms(json.rooms || []);
      } catch (error) {
        console.error("fetchRooms error =", error);
        setErrorMsg("系統錯誤，請稍後再試");
      } finally {
        setLoading(false);
      }
    };

    if (storeSlug) {
      fetchRooms();
    }
  }, [storeSlug]);

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-5">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={() => router.push("/stores")}
          className="mb-4 rounded-xl bg-gray-500 px-4 py-2 text-sm font-medium text-white shadow"
        >
          ← 返回商店列表
        </button>

        <div className="mb-5 rounded-2xl bg-white p-5 shadow border">
          <h1 className="text-2xl font-bold text-black">
            {store ? store.name : "商店"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">請選擇要進入的刮板</p>
        </div>

        {store?.announcement && (
          <div className="mb-5 rounded-2xl border border-yellow-500 bg-yellow-100 p-4 shadow">
            <h2 className="mb-2 text-base font-bold text-yellow-900">
              規則
            </h2>
            <p className="whitespace-pre-line text-sm leading-6 text-yellow-900">
              {store.announcement}
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border bg-white p-5 text-center shadow">
            載入中...
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border bg-white p-5 text-center text-red-500 shadow">
            {errorMsg}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 text-center shadow">
            目前沒有刮板
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() =>
                  router.push(`/stores/${storeSlug}/rooms/${room.slug}`)
                }
                className="w-full rounded-2xl border bg-white p-4 text-left shadow transition active:scale-[0.98]"
              >
                <div className="text-lg font-bold text-black">{room.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  代號：{room.slug}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  狀態：{room.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}