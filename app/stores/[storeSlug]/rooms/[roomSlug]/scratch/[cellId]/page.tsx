"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CellResult = {
  id: string;
  revealed_number: number;
  draw_order: number;
  revealed_at: string | null;
  is_revealed?: boolean;
  is_winner?: boolean | null;
};

const CANVAS_SIZE = 300;
const BRUSH_RADIUS = 28;
const REVEAL_PERCENT = 0.45;

export default function ScratchPage() {
  const params = useParams();
  const router = useRouter();

  const storeSlug = params.storeSlug as string;
  const roomSlug = params.roomSlug as string;
  const cellId = params.cellId as string;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isScratchingRef = useRef(false);
  const hasTriggeredRevealRef = useRef(false);

  const [result, setResult] = useState<CellResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cellId }),
          }
        );

        const text = await res.text();

        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          if (!cancelled) setErrorMsg("伺服器回傳格式錯誤");
          return;
        }

        if (!res.ok) {
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
          is_winner: Boolean(data.cell.is_winner),
        };

        if (cancelled) return;

        setResult(previewResult);
        setReady(true);

        if (previewResult.is_revealed) {
          hasTriggeredRevealRef.current = true;
          setShowMeta(true);
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

  useEffect(() => {
    if (!ready) return;

    if (showMeta) {
      clearMask();
    } else {
      initMask();
    }
  }, [ready, showMeta]);

  const initMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.arc(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#9CA3AF";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("刮開", canvas.width / 2, canvas.height / 2);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cellId }),
        }
      );

      const text = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        setErrorMsg("伺服器回傳格式錯誤");
        hasTriggeredRevealRef.current = false;
        return false;
      }

      if (!res.ok) {
        setErrorMsg(data.error || "失敗");
        hasTriggeredRevealRef.current = false;
        return false;
      }

      if (!data?.cell) {
        setErrorMsg("回傳資料不完整");
        hasTriggeredRevealRef.current = false;
        return false;
      }

      setResult({
        id: data.cell.id,
        revealed_number: Number(data.cell.revealed_number),
        draw_order: Number(data.cell.draw_order),
        revealed_at: data.cell.revealed_at ?? null,
        is_revealed: Boolean(data.cell.is_revealed),
        is_winner: Boolean(data.cell.is_winner),
      });

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

  const getScratchedPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    let totalCirclePixels = 0;
    let transparentPixels = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;

        if (dx * dx + dy * dy <= radius * radius) {
          totalCirclePixels++;

          const alphaIndex = (y * canvas.width + x) * 4 + 3;

          if (data[alphaIndex] === 0) {
            transparentPixels++;
          }
        }
      }
    }

    return transparentPixels / totalCirclePixels;
  };

  const scratchAt = async (clientX: number, clientY: number) => {
    if (!ready || submitting || showMeta || !result) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    const percent = getScratchedPercent();

    if (percent >= REVEAL_PERCENT && !hasTriggeredRevealRef.current) {
      clearMask();

      const ok = await revealFinal();

      if (ok) {
        setShowMeta(true);
      } else {
        initMask();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isScratchingRef.current = true;
    scratchAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current) return;
    scratchAt(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isScratchingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isScratchingRef.current = true;

    const touch = e.touches[0];
    if (!touch) return;

    scratchAt(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current) return;

    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    scratchAt(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    isScratchingRef.current = false;
  };

  return (
    <main className="min-h-screen bg-blue-100 px-4 py-6">
      <div className="mx-auto max-w-md">
        <div
          className={`rounded-3xl p-5 text-center shadow-lg ${
            result?.is_winner && showMeta
              ? "bg-yellow-100"
              : "bg-white"
          }`}
        >
          <h1 className="mb-4 text-xl font-bold text-black">
            {showMeta ? "結果" : "手指刮開"}
          </h1>

          {result?.is_winner && showMeta && (
            <div className="mb-4 rounded-2xl bg-red-500 px-4 py-3 text-white shadow">
              <p className="text-2xl font-extrabold">🎉 恭喜中獎 🎉</p>
            </div>
          )}

          <div className="mb-6 flex justify-center">
            <div
              className={`relative h-72 w-72 overflow-hidden rounded-full border shadow-inner ${
                result?.is_winner && showMeta
                  ? "border-red-500 bg-yellow-200"
                  : "bg-gray-100"
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-8xl font-bold tracking-wide ${
                    result?.is_winner && showMeta
                      ? "text-red-600"
                      : "text-black"
                  }`}
                >
                  {formattedNumber}
                </span>
              </div>

              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 h-full w-full touch-none rounded-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
          </div>

          {result && showMeta && (
            <>
              <div className="mb-4 rounded-2xl bg-gray-200 px-4 py-3 text-left">
                <p className="text-sm text-gray-600">店家</p>
                <p className="text-base font-semibold text-black">
                  {storeSlug}
                </p>
              </div>

              <p className="text-lg font-semibold text-black">
                第 {result.draw_order} 抽
              </p>

              <button
                onClick={() =>
                  router.push(`/stores/${storeSlug}/rooms/${roomSlug}`)
                }
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