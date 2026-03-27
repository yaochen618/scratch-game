"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: number;
  name: string;
  slug: string;
};

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch("/api/stores", {
          cache: "no-store",
        });

        const text = await res.text();
        console.log("stores API 原始回傳 =", text);

        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch {
          setErrorMsg("伺服器回傳格式錯誤");
          return;
        }

        if (!res.ok) {
          setErrorMsg(json.error || "讀取商店失敗");
          return;
        }

        setStores(json.stores || []);
      } catch (error) {
        console.error("fetchStores error =", error);
        setErrorMsg("系統錯誤，請稍後再試");
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return (
    <main className="min-h-screen bg-blue-200 px-4 py-5">
      <div className="mx-auto max-w-md">
        <div className="mb-5 rounded-2xl bg-white p-5 shadow">
          <h1 className="text-2xl font-bold text-black">商店列表</h1>
          <p className="mt-1 text-sm text-gray-500">
            請選擇要進入的商店
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
        ) : stores.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow">
            目前沒有商店
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => router.push(`/stores/${store.slug}`)}
                className="w-full rounded-2xl bg-white p-4 text-left shadow transition active:scale-[0.98]"
              >
                <div className="text-lg font-bold text-black">{store.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  代號：{store.slug}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}