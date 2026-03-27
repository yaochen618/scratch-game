import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getAllowedNumbers(drawOrder: number): number[] {
  if (drawOrder <= 5) {
    return Array.from({ length: 27 }, (_, i) => i + 4); // 4~30
  }

  if (drawOrder <= 10) {
    return Array.from({ length: 29 }, (_, i) => i + 2); // 2~30
  }

  return Array.from({ length: 30 }, (_, i) => i + 1); // 1~30
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cellId } = body;

    if (!cellId) {
      return NextResponse.json(
        { error: "缺少 cellId" },
        { status: 400 }
      );
    }

    // 1. 找這一格
    const { data: cell, error: cellError } = await supabase
      .from("session_cells")
      .select("id, session_id, cell_index, is_revealed")
      .eq("id", cellId)
      .single();

    if (cellError || !cell) {
      return NextResponse.json(
        { error: "找不到該格子" },
        { status: 404 }
      );
    }

    if (cell.is_revealed) {
      return NextResponse.json(
        { error: "這格已經刮開了" },
        { status: 400 }
      );
    }

    // 2. 取得同一個 session 已開過的格子
    const { data: openedCells, error: openedError } = await supabase
      .from("session_cells")
      .select("id, revealed_number, draw_order")
      .eq("session_id", cell.session_id)
      .eq("is_revealed", true)
      .order("draw_order", { ascending: true });

    if (openedError) {
      return NextResponse.json(
        { error: "讀取已開格子失敗" },
        { status: 500 }
      );
    }

    const openedCount = openedCells?.length || 0;
    const nextDrawOrder = openedCount + 1;

    // 3. 依照抽獎次數取得本次允許的數字池
    const allowedNumbers = getAllowedNumbers(nextDrawOrder);

    // 4. 已經抽過的數字不能再出現
    const usedNumbers = new Set(
      (openedCells || [])
        .map((item) => item.revealed_number)
        .filter((num): num is number => num !== null)
    );

    const availableNumbers = allowedNumbers.filter(
      (num) => !usedNumbers.has(num)
    );

    if (availableNumbers.length === 0) {
      return NextResponse.json(
        {
          error: `第 ${nextDrawOrder} 抽已沒有可用數字，請檢查規則或重置刮板`,
        },
        { status: 400 }
      );
    }

    // 5. 從可用數字中抽一個
    const revealedNumber = getRandomItem(availableNumbers);
    const now = new Date().toISOString();

    // 6. 更新這一格
    const { data: updatedCell, error: updateError } = await supabase
      .from("session_cells")
      .update({
        is_revealed: true,
        revealed_number: revealedNumber,
        draw_order: nextDrawOrder,
        opened_at: now,
      })
      .eq("id", cell.id)
      .eq("is_revealed", false)
      .select("id, cell_index, is_revealed, revealed_number, draw_order, opened_at")
      .single();

    if (updateError || !updatedCell) {
      return NextResponse.json(
        { error: "更新格子失敗" },
        { status: 500 }
      );
    }

    // 7. 如果 30 格全開，可順便把 session 標記 completed
    if (nextDrawOrder >= 30) {
      await supabase
        .from("game_sessions")
        .update({ status: "completed" })
        .eq("id", cell.session_id);
    }

    return NextResponse.json({
      success: true,
      cell: updatedCell,
    });
  } catch (error) {
    console.error("reveal error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}