"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CellResult = {
  id: string;
  revealed_number: number;
  draw_order: number;
  revealed_at: string | null;
  is_revealed?: boolean;
};

type ScratchMode = "none" | "left" | "right" | "all";

export default function ScratchPage() {
  const params = useParams();
  const router = useRouter();

  const storeSlug = params.storeSlug as string;
  const roomSlug = params.roomSlug as string;
  const cellId = params.cellId as string;

  const [result, setResult] = useState<CellResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [scratchMode, setScratchMode] = useState<ScratchMode>("none");
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasTriggeredRevealRef = useRef(false);

  const formattedNumber = useMemo(() => {
    if (!result) return "00";
    return String(result.revealed_number).padStart(2, "0");
  }, [result]);

  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `/api/stores/${storeSlug}/rooms/${roomSlug}/scratch/preview`,
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
          console.error("preview API 非 JSON 回傳：", text);
          if (!cancelled) setErrorMsg("伺服器回傳格式錯誤");
          return;
        }

        if (!res.ok) {
          console.error("preview API 錯誤：", data);
          if (!cancelled) setErrorMsg(data.error || "失敗");
          return;
        }

        if (!data?.cell) {
          if (!cancelled) setErrorMsg("回傳資料不完整");
          return;
        }

        const previewResult: CellResult = {
          id: data.cell.id,
          revealed_number: Number(data.cell.revealed_number),
          draw_order: Number(data.cell.draw_order),
          revealed_at: data.cell.revealed_at ?? null,
          is_revealed: Boolean(data.cell.is_revealed),
        };

        if (cancelled) return;

        // 畫面直接固定用 preview 的值
        setResult(previewResult);
        setReady(true);

        if (previewResult.is_revealed) {
          setScratchMode("all");
          setShowFinishButton(false);
          setShowMeta(true);
          hasTriggeredRevealRef.current = true;
        }
      } catch (error) {
        console.error("scratch page preview error:", error);
        if (!cancelled) setErrorMsg("系統錯誤");
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [storeSlug, roomSlug, cellId]);

  const revealFinal = async () => {
    if (hasTriggeredRevealRef.current) return true;

    hasTriggeredRevealRef.current = true;
    setSubmitting(true);
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
        hasTriggeredRevealRef.current = false;
        return false;
      }

      if (!res.ok) {
        console.error("scratch API 錯誤：", data);
        setErrorMsg(data.error || "失敗");
        hasTriggeredRevealRef.current = false;
        return false;
      }

      if (!data?.cell) {
        setErrorMsg("回傳資料不完整");
        hasTriggeredRevealRef.current = false;
        return false;
      }

      // 注意：這裡不要 setResult，避免數字跳動
      return true;
    } catch (error) {
      console.error("scratch page reveal error:", error);
      setErrorMsg("系統錯誤");
      hasTriggeredRevealRef.current = false;
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleScratchLeft = async () => {
    if (!ready || submitting || !result) return;

    setShowMeta(false);
    setScratchMode("left");
    setShowFinishButton(true);

    const ok = await revealFinal();
    if (!ok) {
      setScratchMode("none");
      setShowFinishButton(false);
    }
  };

  const handleScratchRight = async () => {
    if (!ready || submitting || !result) return;

    setShowMeta(false);
    setScratchMode("right");
    setShowFinishButton(true);

    const ok = await revealFinal();
    if (!ok) {
      setScratchMode("none");
      setShowFinishButton(false);
    }
  };

  const handleScratchAllDirect = async () => {
    if (!ready || submitting || !result) return;

    setShowFinishButton(false);
    setScratchMode("all");

    const ok = await revealFinal();
    if (!ok) {
      setScratchMode("none");
      return;
    }

    setShowMeta(true);
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

              {scratchMode === "none" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-semibold text-white/90">
                    刮開
                  </span>
                </div>
              )}
            </div>
          </div>

          {!showMeta && (
            <div className="space-y-3">
              {!showFinishButton ? (
                <>
                  <button
                    onClick={handleScratchLeft}
                    className="w-full rounded-xl bg-black py-3 font-semibold text-white"
                  >
                    刮左半
                  </button>

                  <button
                    onClick={handleScratchRight}
                    className="w-full rounded-xl bg-black py-3 font-semibold text-white"
                  >
                    刮右半
                  </button>

                  <button
                    onClick={handleScratchAllDirect}
                    className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white"
                  >
                    直接刮開
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-black">刮開全部查看完整數字</p>

                  <button
                    onClick={handleFinishScratch}
                    className="w-full rounded-xl bg-black py-3 font-semibold text-white"
                  >
                    刮開全部
                  </button>
                </>
              )}
            </div>
          )}

          {result && showMeta && (
            <>
              <div className="mb-4 rounded-2xl bg-gray-200 px-4 py-3 text-left">
                <p className="text-sm text-gray-600">店家</p>
                <p className="text-base font-semibold text-black">{storeSlug}</p>
              </div>

              <p className="text-lg font-semibold text-black">
                第 {result.draw_order} 抽
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