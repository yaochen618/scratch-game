"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  slug: string;
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
  const storeSlug = params.storeSlug as string;

  const [store, setStore] = useState<Store | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(`/api/stores/${storeSlug}/rooms`, {
          cache: "no-store",
        });

        const text = await res.text();

        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch {
          setErrorMsg("伺服器回傳格式錯誤");
          return;
        }

        if (!res.ok) {
          setErrorMsg(json.error || "讀取刮板失敗");
          return;
        }

        setStore(json.store || null);
        setRooms(json.rooms || []);
      } catch (error) {
        console.error(error);
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
    <main className="min-h-screen bg-gray-100 px-4 py-5">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={() => router.push("/stores")}
          className="mb-4 rounded-xl bg-white px-4 py-2 text-sm font-medium shadow"
        >
          ← 返回商店列表
        </button>

        <div className="mb-5 rounded-2xl bg-white p-5 shadow">
          <h1 className="text-2xl font-bold">
            {store ? store.name : "商店"}
          </h1>
          <p className="mt-1 text-sm text-gray-800">
            請選擇要進入的刮板
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow">
            載入中...
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl bg-white p-5 text-center text-red-500 shadow">
            {errorMsg}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow">
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
                className="w-full rounded-2xl bg-white p-4 text-left shadow transition active:scale-[0.98]"
              >
                <div className="text-lg font-bold">{room.name}</div>
                <div className="mt-1 text-sm text-gray-800">
                  代號：{room.slug}
                </div>
                <div className="mt-1 text-sm text-gray-800">
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