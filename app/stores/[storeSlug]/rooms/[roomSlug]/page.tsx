"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Cell = {
  id: string;
  cell_index: number;
  is_revealed: boolean;
  revealed_number: number | null;
  revealed_at: string | null;
  session_id?: string | null;
};

type Room = {
  id: string;
  name: string;
  slug: string;
  status: string;
  cell_count: number;
};

type RoomApiResponse = {
  room: Room | null;
  cells: Cell[];
  sessionId?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getGridColumns(cellCount: number) {
  switch (cellCount) {
    case 6:
      return 3;
    case 9:
      return 3;
    case 15:
      return 3;
    case 20:
      return 5;
    case 25:
      return 5;
    case 30:
      return 5;
    case 40:
      return 5;
    case 50:
      return 5;
    case 60:
      return 6;
    case 100:
      return 10;
    case 120:
      return 10;
    case 200:
      return 10;
    default:
      return Math.ceil(Math.sqrt(cellCount));
  }
}

function getCellSize(cellCount: number) {
  if (cellCount <= 9) return 72;
  if (cellCount <= 25) return 64;
  if (cellCount <= 60) return 52;
  if (cellCount <= 120) return 42;
  return 38;
}

export default function RoomBoardPage() {
  const params = useParams();
  const router = useRouter();

  const storeSlug = params.storeSlug as string;
  const roomSlug = params.roomSlug as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRoomData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setErrorMsg("");

      const res = await fetch(`/api/stores/${storeSlug}/rooms/${roomSlug}`, {
        cache: "no-store",
      });

      const text = await res.text();
      console.log("room detail status =", res.status);
      console.log("room detail raw =", text);

      let data: RoomApiResponse | null = null;

      try {
        data = JSON.parse(text);
      } catch {
        setErrorMsg(`伺服器回傳格式錯誤（HTTP ${res.status}）`);
        return;
      }

      if (!res.ok) {
        setErrorMsg((data as any)?.error || "讀取失敗");
        return;
      }

      const nextRoom = data?.room || null;
      const nextCells = data?.cells || [];
      const nextSessionId =
        data?.sessionId ||
        nextCells.find((cell) => cell.session_id)?.session_id ||
        null;

      console.log("nextSessionId =", nextSessionId);

      setRoom(nextRoom);
      setCells(nextCells);
      setSessionId(nextSessionId);
    } catch (error) {
      console.error("fetchRoomData error =", error);
      setErrorMsg("系統錯誤");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [storeSlug, roomSlug]);

  useEffect(() => {
    if (storeSlug && roomSlug) {
      fetchRoomData();
    }
  }, [storeSlug, roomSlug, fetchRoomData]);

  // Realtime
  useEffect(() => {
    if (!sessionId) {
      console.log("沒有 sessionId，Realtime 不會啟動");
      return;
    }

    console.log("開始訂閱 session =", sessionId);

    const channel = supabase
      .channel(`room-board-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_cells",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log("收到 session_cells 更新：", payload);
          await fetchRoomData(false);
        }
      )
      .subscribe((status) => {
        console.log("Realtime 狀態 =", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchRoomData]);

  // 備援：每 2 秒自動更新一次
  useEffect(() => {
    if (!storeSlug || !roomSlug) return;

    const timer = setInterval(() => {
      fetchRoomData(false);
    }, 2000);

    return () => clearInterval(timer);
  }, [storeSlug, roomSlug, fetchRoomData]);

  const revealedCount = cells.filter((cell) => cell.is_revealed).length;
  const totalCount = room?.cell_count ?? cells.length;
  const gridCols = getGridColumns(totalCount);
  const cellSize = getCellSize(totalCount);

  const backToStore = () => {
    router.push(`/stores/${storeSlug}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-blue-200 p-4 sm:p-6">
        <button
          type="button"
          onClick={backToStore}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
        >
          ← 返回商店頁面
        </button>
        <div className="text-black">載入中...</div>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-blue-200 p-4 sm:p-6">
        <button
          type="button"
          onClick={backToStore}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
        >
          ← 返回商店頁面
        </button>
        <div className="text-red-500">{errorMsg}</div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-white p-4 sm:p-6">
        <button
          type="button"
          onClick={backToStore}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
        >
          ← 返回商店頁面
        </button>
        <div className="text-black">找不到刮板</div>
      </main>
    );
  }

  if (room.status !== "active") {
    return (
      <main className="min-h-screen bg-blue-200 p-4 sm:p-6">
        <button
          type="button"
          onClick={backToStore}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
        >
          ← 返回商店頁面
        </button>

        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <h1 className="text-2xl font-bold text-black">尚未開放刮卡</h1>

          <p className="mt-3 text-gray-600">
            此刮板目前為 {room.status === "draft" ? "草稿狀態" : "未開放"}，
            暫時無法遊玩。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-200 p-4 sm:p-6">
      <button
        type="button"
        onClick={backToStore}
        className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-black hover:bg-gray-100"
      >
        ← 返回商店頁面
      </button>

      <h1 className="text-2xl font-bold text-black">{room.name}</h1>

      <p className="mt-2 text-gray-600">
        已刮開：{revealedCount}/{totalCount}
      </p>

      {drawing && <p className="mt-2 text-sm text-gray-500">刮開中...</p>}

      <div className="mt-6 overflow-x-auto">
        <div
          className="grid min-w-max justify-center gap-2"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
          }}
        >
          {cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              disabled={cell.is_revealed || drawing}
              onClick={() =>
                router.push(
                  `/stores/${storeSlug}/rooms/${roomSlug}/scratch/${cell.id}`
                )
              }
              className={`flex shrink-0 items-center justify-center rounded-xl border font-bold transition ${
                cell.is_revealed
                  ? "cursor-not-allowed border-yellow-300 bg-white text-black"
                  : "cursor-pointer border-black-300 bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95"
              }`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                fontSize:
                  cellSize >= 64 ? "18px" : cellSize >= 42 ? "16px" : "13px",
              }}
            >
              {cell.is_revealed
                ? String(cell.revealed_number ?? "").padStart(2, "0")
                : "?"}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}