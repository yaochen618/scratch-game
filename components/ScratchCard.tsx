"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScratchCardProps = {
  onScratchStart?: () => void;
  onReveal: () => Promise<void>;
  revealed: boolean;
  finalText?: string;
};

export default function ScratchCard({
  onScratchStart,
  onReveal,
  revealed,
  finalText,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const size = useMemo(() => {
    if (typeof window === "undefined") return 220;
    return Math.min(window.innerWidth * 0.68, 240);
  }, []);

  const drawSize = Math.floor(size);
  const radius = drawSize / 2;

  const fakeHints = ["8?", "?3", "1?", "?7", "2?", "?9"];

  const fakeHint = useMemo(() => {
    return fakeHints[Math.floor(Math.random() * fakeHints.length)];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = drawSize;
    canvas.height = drawSize;

    ctx.clearRect(0, 0, drawSize, drawSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(0, 0, drawSize, drawSize);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("刮開", radius, radius);

    ctx.restore();

    ctx.globalCompositeOperation = "destination-out";
  }, [revealed, drawSize, radius]);

  const getPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const x = ((clientX - rect.left) / rect.width) * drawSize;
    const y = ((clientY - rect.top) / rect.height) * drawSize;

    const dx = x - radius;
    const dy = y - radius;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) return null;
    return { x, y };
  };

  const scratchAt = async (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    await checkRevealThreshold();
  };

  const checkRevealThreshold = async () => {
    if (revealing || revealed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, drawSize, drawSize);
    const pixels = imageData.data;

    let transparentCount = 0;
    let circleCount = 0;

    for (let y = 0; y < drawSize; y++) {
      for (let x = 0; x < drawSize; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          circleCount++;
          const index = (y * drawSize + x) * 4;
          const alpha = pixels[index + 3];
          if (alpha < 20) transparentCount++;
        }
      }
    }

    const percent = transparentCount / circleCount;

    if (percent >= 0.42) {
      setRevealing(true);
      await onReveal();
    }
  };

  const startScratch = () => {
    if (!hasStarted) {
      setHasStarted(true);
      onScratchStart?.();
    }
    setIsDrawing(true);
  };

  return (
    <div className="flex justify-center">
      <div
        className="relative"
        style={{ width: drawSize, height: drawSize }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-white"
          style={{ width: drawSize, height: drawSize }}
        >
          {revealed ? (
            <span className="text-5xl font-bold text-black">
              {finalText ?? "?"}
            </span>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white">
              <span className="text-5xl font-bold tracking-wider text-gray-400 blur-[2px] select-none">
                {fakeHint}
              </span>
              <span className="absolute -translate-x-6 -translate-y-7 rotate-[-12deg] text-3xl font-bold text-gray-300 blur-[3px] select-none">
                ?
              </span>
              <span className="absolute translate-x-7 translate-y-6 rotate-[10deg] text-2xl font-bold text-gray-300 blur-[3px] select-none">
                9
              </span>
            </div>
          )}
        </div>

        {!revealed && (
          <canvas
            ref={canvasRef}
            width={drawSize}
            height={drawSize}
            className="absolute inset-0 rounded-full touch-none"
            style={{ width: drawSize, height: drawSize }}
            onMouseDown={(e) => {
              startScratch();
              const point = getPoint(e.clientX, e.clientY);
              if (point) void scratchAt(point.x, point.y);
            }}
            onMouseMove={(e) => {
              if (!isDrawing) return;
              const point = getPoint(e.clientX, e.clientY);
              if (point) void scratchAt(point.x, point.y);
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={(e) => {
              startScratch();
              const touch = e.touches[0];
              if (!touch) return;
              const point = getPoint(touch.clientX, touch.clientY);
              if (point) void scratchAt(point.x, point.y);
            }}
            onTouchMove={(e) => {
              if (!isDrawing) return;
              e.preventDefault();
              const touch = e.touches[0];
              if (!touch) return;
              const point = getPoint(touch.clientX, touch.clientY);
              if (point) void scratchAt(point.x, point.y);
            }}
            onTouchEnd={() => setIsDrawing(false)}
          />
        )}
      </div>
    </div>
  );
}