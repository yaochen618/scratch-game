import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    storeSlug: string;
    roomSlug: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;
    const body = await req.json();
    const cellId = body?.cellId;

    if (!storeSlug || !roomSlug) {
      return NextResponse.json(
        { error: "缺少 storeSlug 或 roomSlug" },
        { status: 400 }
      );
    }

    if (cellId === undefined || cellId === null || cellId === "") {
      return NextResponse.json(
        { error: "缺少 cellId" },
        { status: 400 }
      );
    }

    // 1. 找商店
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 2. 找房間
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, draw_mode, cell_count")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到刮板" }, { status: 404 });
    }

    console.log("========== REVEAL DEBUG ==========");
    console.log("storeSlug =", storeSlug);
    console.log("roomSlug =", roomSlug);
    console.log("room.id =", room.id);
    console.log("cellId =", cellId, "type =", typeof cellId);

    // 3. 找該格（改查 scratch_cells）
    const { data: targetCell, error: cellError } = await supabase
      .from("scratch_cells")
      .select("id, room_id, cell_index, is_revealed, revealed_number, revealed_at")
      .eq("room_id", room.id)
      .eq("id", Number(cellId))
      .maybeSingle();

    console.log("targetCell =", targetCell);
    console.log("cellError =", cellError);
    console.log("=================================");

    if (cellError) {
      return NextResponse.json(
        { error: "讀取格子失敗", detail: cellError.message },
        { status: 500 }
      );
    }

    if (!targetCell) {
      return NextResponse.json(
        { error: "找不到該格子" },
        { status: 404 }
      );
    }

    if (targetCell.is_revealed) {
      return NextResponse.json({
        cell: {
          id: targetCell.id,
          revealed_number: targetCell.revealed_number,
          draw_order: targetCell.cell_index,
          opened_at: targetCell.revealed_at,
        },
      });
    }

    // 4. 先取得目前已刮開數量，決定這是第幾抽
    const { count: revealedCount, error: countError } = await supabase
      .from("scratch_cells")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id)
      .eq("is_revealed", true);

    if (countError) {
      return NextResponse.json(
        { error: "計算抽取順序失敗", detail: countError.message },
        { status: 500 }
      );
    }

    const nextDrawOrder = (revealedCount || 0) + 1;

    // 5. 取得目前已使用的數字
    const { data: usedCells, error: usedError } = await supabase
      .from("scratch_cells")
      .select("revealed_number")
      .eq("room_id", room.id)
      .eq("is_revealed", true);

    if (usedError) {
      return NextResponse.json(
        { error: "讀取已用數字失敗", detail: usedError.message },
        { status: 500 }
      );
    }

    const usedNumbers = new Set(
      (usedCells || [])
        .map((c) => c.revealed_number)
        .filter((n): n is number => n !== null)
    );

    // 6. 依 draw_mode 組號碼池
    let allowedNumbers: number[] = [];

    const cellCount = room.cell_count ?? 30;

    if (room.draw_mode === "special") {
      allowedNumbers = Array.from({ length: cellCount }, (_, i) => i + 1);

      if (nextDrawOrder >= 5) {
        allowedNumbers.push(2, 3);
      }

      if (nextDrawOrder >= 10) {
        allowedNumbers.push(1);
      }
    } else {
      allowedNumbers = Array.from({ length: cellCount }, (_, i) => i + 1);
    }

    const remainingNumbers = allowedNumbers.filter(
      (num) => !usedNumbers.has(num)
    );

    if (remainingNumbers.length === 0) {
      return NextResponse.json(
        { error: "目前沒有可抽取的號碼" },
        { status: 400 }
      );
    }

    // 7. 隨機抽一個號碼
    const revealedNumber =
      remainingNumbers[Math.floor(Math.random() * remainingNumbers.length)];

    const now = new Date().toISOString();

    // 8. 更新該格
    const { data: updatedCell, error: updateError } = await supabase
      .from("scratch_cells")
      .update({
        is_revealed: true,
        revealed_number: revealedNumber,
        revealed_at: now,
      })
      .eq("id", Number(cellId))
      .eq("room_id", room.id)
      .select("id, cell_index, revealed_number, revealed_at")
      .single();

    if (updateError || !updatedCell) {
      return NextResponse.json(
        {
          error: "更新格子失敗",
          detail: updateError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cell: {
        id: updatedCell.id,
        revealed_number: updatedCell.revealed_number,
        draw_order: nextDrawOrder,
        opened_at: updatedCell.revealed_at,
      },
    });
  } catch (error) {
    console.error("POST reveal error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}