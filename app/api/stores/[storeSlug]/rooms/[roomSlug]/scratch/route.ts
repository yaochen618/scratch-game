import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getForcedNumber, normalizeForceRules } from "@/lib/force-rules";

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

function buildAllowedNumbers(drawMode: string | null, nextDrawOrder: number) {
  if (drawMode === "special") {
    // 你的特殊邏輯：
    // 一開始只有 4~30
    // 第 5 抽後加入 2、3
    // 第 10 抽後加入 1
    const nums = Array.from({ length: 27 }, (_, i) => i + 4); // 4~30

    if (nextDrawOrder >= 5) {
      nums.push(2, 3);
    }

    if (nextDrawOrder >= 10) {
      nums.push(1);
    }

    return nums;
  }

  // 一般模式：1~30
  return Array.from({ length: 30 }, (_, i) => i + 1);
}

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

    // 2. 找房間（重點：多查 force_rules）
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, draw_mode, cell_count, force_rules")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到刮板" }, { status: 404 });
    }

    // 3. 找該格
    const { data: targetCell, error: cellError } = await supabase
      .from("cells")
      .select("id, room_id, cell_index, is_revealed, revealed_number, revealed_at")
      .eq("room_id", room.id)
      .eq("id", String(cellId))
      .maybeSingle();

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
          revealed_at: targetCell.revealed_at,
        },
      });
    }

    // 4. 算這是第幾抽
    const { count: revealedCount, error: countError } = await supabase
      .from("cells")
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

    // 5. 取得已經抽過的數字
    const { data: usedCells, error: usedError } = await supabase
      .from("cells")
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

    // 6. 建立本次可抽號碼池
    const allowedNumbers = buildAllowedNumbers(
      room.draw_mode ?? null,
      nextDrawOrder
    );

    const remainingNumbers = allowedNumbers.filter(
      (num) => !usedNumbers.has(num)
    );

    if (remainingNumbers.length === 0) {
      return NextResponse.json(
        { error: "目前沒有可抽取的號碼" },
        { status: 400 }
      );
    }

    // 7. 套用特殊規則（重點）
    const forceRules = normalizeForceRules(room.force_rules);

    const forcedNumber = getForcedNumber({
      forceRules,
      drawOrder: nextDrawOrder,
      cellIndex: targetCell.cell_index,
      remainingNumbers,
    });

    const revealedNumber =
      forcedNumber !== null
        ? forcedNumber
        : remainingNumbers[Math.floor(Math.random() * remainingNumbers.length)];

    const now = new Date().toISOString();

    // debug，先留著方便你確認
    console.log("========== REVEAL DEBUG ==========");
    console.log("storeSlug =", storeSlug);
    console.log("roomSlug =", roomSlug);
    console.log("room.id =", room.id);
    console.log("cellId =", cellId);
    console.log("targetCell.cell_index =", targetCell.cell_index);
    console.log("draw_mode =", room.draw_mode);
    console.log("force_rules =", room.force_rules);
    console.log("nextDrawOrder =", nextDrawOrder);
    console.log("remainingNumbers =", remainingNumbers);
    console.log("forcedNumber =", forcedNumber);
    console.log("revealedNumber =", revealedNumber);
    console.log("=================================");

    // 8. 更新格子
    const { data: updatedCell, error: updateError } = await supabase
      .from("cells")
      .update({
        is_revealed: true,
        revealed_number: revealedNumber,
        revealed_at: now,
      })
      .eq("id", String(cellId))
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
        revealed_at: updatedCell.revealed_at,
      },
      debug: {
        forced: forcedNumber !== null,
        forcedNumber,
        nextDrawOrder,
        cellIndex: targetCell.cell_index,
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