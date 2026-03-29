"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CellResult = {
  id: string;
  revealed_number: number;
  draw_order: number;
  revealed_at: string;
};

type ScratchMode = "none" | "left" | "right" | "all";

export default function ScratchPage() {
  const params = useParams();
  const router = useRouter();

  const storeSlug = params.storeSlug as string;
  const roomSlug = params.roomSlug as string;
  const cellId = params.cellId as string;

  const [result, setResult] = useState<CellResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [locked, setLocked] = useState(false);
  const [scratchMode, setScratchMode] = useState<ScratchMode>("none");
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const formattedNumber = useMemo(() => {
    if (!result) return "00";
    return String(result.revealed_number).padStart(2, "0");
  }, [result]);

  const reveal = async () => {
    if (result) return result;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(
        `/api/stores/${storeSlug}/rooms/${roomSlug}/scratch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cellId }),
        }
      );

      const text = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        console.error("scratch API 非 JSON 回傳：", text);
        setErrorMsg("伺服器回傳格式錯誤");
        return null;
      }

      if (!res.ok) {
        console.error("scratch API 錯誤：", data);
        setErrorMsg(data.error || "失敗");
        return null;
      }

      if (!data?.cell) {
        setErrorMsg("回傳資料不完整");
        return null;
      }

      setResult(data.cell);
      setLocked(true);
      return data.cell as CellResult;
    } catch (error) {
      console.error("scratch page reveal error:", error);
      setErrorMsg("系統錯誤");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleScratchLeft = async () => {
    const revealed = await reveal();
    if (!revealed) return;

    setShowMeta(false);
    setScratchMode("left");

    window.setTimeout(() => {
      setShowFinishButton(true);
    }, 0);
  };

  const handleScratchRight = async () => {
    const revealed = await reveal();
    if (!revealed) return;

    setShowMeta(false);
    setScratchMode("right");

    window.setTimeout(() => {
      setShowFinishButton(true);
    }, 0);
  };

  const handleScratchAllDirect = async () => {
    const revealed = await reveal();
    if (!revealed) return;

    setShowFinishButton(false);
    setScratchMode("all");

    window.setTimeout(() => {
      setShowMeta(true);
    }, 0);
  };

  const handleFinishScratch = () => {
    setShowFinishButton(false);
    setScratchMode("all");

    window.setTimeout(() => {
      setShowMeta(true);
    }, 0);
  };

  return (
    <main className="min-h-screen bg-blue-100 px-4 py-6">
      <div className="mx-auto max-w-md">
        {!locked && (
          <button
            onClick={() => router.push(`/stores/${storeSlug}/rooms/${roomSlug}`)}
            className="mb-4 rounded-xl bg-gray-500 px-4 py-2 text-white shadow"
          >
            ← 返回刮板
          </button>
        )}

        <div className="rounded-3xl bg-white p-5 text-center shadow-lg">
          <h1 className="mb-4 text-xl font-bold text-black">
            {showMeta ? "結果" : "選擇刮開方式"}
          </h1>

          <div className="mb-6 flex justify-center">
            <div className="relative h-44 w-44 overflow-hidden rounded-full border bg-gray-100 shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold tracking-wide text-black">
                  {formattedNumber}
                </span>
              </div>

              <div
                className={`absolute left-0 top-0 h-full bg-gray-400 transition-all duration-700 ease-in-out ${
                  scratchMode === "none"
                    ? "w-1/2"
                    : scratchMode === "left"
                    ? "w-0"
                    : scratchMode === "right"
                    ? "w-1/2"
                    : "w-0"
                }`}
              />

              <div
                className={`absolute right-0 top-0 h-full bg-gray-400 transition-all duration-700 ease-in-out ${
                  scratchMode === "none"
                    ? "w-1/2"
                    : scratchMode === "left"
                    ? "w-1/2"
                    : scratchMode === "right"
                    ? "w-0"
                    : "w-0"
                }`}
              />

              {scratchMode === "none" && !result && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-semibold text-white/90">
                    刮開
                  </span>
                </div>
              )}
            </div>
          </div>

          {!result && (
            <div className="space-y-3">
              <button
                onClick={handleScratchLeft}
                disabled={loading}
                className="w-full rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "處理中..." : "刮左半"}
              </button>

              <button
                onClick={handleScratchRight}
                disabled={loading}
                className="w-full rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "處理中..." : "刮右半"}
              </button>

              <button
                onClick={handleScratchAllDirect}
                disabled={loading}
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "處理中..." : "直接刮開"}
              </button>
            </div>
          )}

          {result && !showMeta && showFinishButton && (
            <div className="space-y-3">
              <p className="text-sm text-black">刮開全部查看完整數字</p>

              <button
                onClick={handleFinishScratch}
                className="w-full rounded-xl bg-black py-3 font-semibold text-white"
              >
                刮開全部
              </button>
            </div>
          )}

          {result && showMeta && (
            <>
              <div className="mb-4 rounded-2xl bg-gray-200 px-4 py-3 text-left">
                <p className="text-sm text-gray-600">店家</p>
                <p className="text-base font-semibold text-black">{storeSlug}</p>

                <p className="mt-3 text-sm text-gray-600">板號</p>
                <p className="text-base font-semibold text-black">{roomSlug}</p>
              </div>

              <p className="text-lg font-semibold text-black">
                第 {result.draw_order} 抽
              </p>

              <p className="mt-2 text-sm text-gray-400">
                開啟時間：{new Date(result.revealed_at).toLocaleString()}
              </p>

              <button
                onClick={() => router.push(`/stores/${storeSlug}/rooms/${roomSlug}`)}
                className="mt-6 w-full rounded-xl bg-black py-3 font-semibold text-white"
              >
                回到刮板
              </button>
            </>
          )}

          {errorMsg && <p className="mt-4 text-sm text-red-500">{errorMsg}</p>}
        </div>
      </div>
    </main>
  );
}