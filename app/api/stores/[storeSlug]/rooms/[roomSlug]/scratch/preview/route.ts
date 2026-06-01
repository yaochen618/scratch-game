import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parsePrizeNumbers(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((number) => Number.isInteger(number));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cellId } = body;

    if (!cellId) {
      return NextResponse.json({ error: "缺少 cellId" }, { status: 400 });
    }

    const { data: currentCell, error: cellError } = await supabase
      .from("cells")
      .select(
        `
        id,
        room_id,
        revealed_number,
        draw_order,
        is_revealed,
        revealed_at
      `
      )
      .eq("id", cellId)
      .single();

    if (cellError || !currentCell) {
      return NextResponse.json({ error: "找不到格子" }, { status: 404 });
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("prize_numbers")
      .eq("id", currentCell.room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    const prizeNumbers = parsePrizeNumbers(room.prize_numbers);

    if (
      currentCell.revealed_number !== null &&
      currentCell.draw_order !== null
    ) {
      const isWinner =
        prizeNumbers.length > 0 &&
        prizeNumbers.includes(Number(currentCell.revealed_number));

      return NextResponse.json({
        success: true,
        cell: {
          id: currentCell.id,
          revealed_number: currentCell.revealed_number,
          draw_order: currentCell.draw_order,
          revealed_at: currentCell.revealed_at,
          is_revealed: currentCell.is_revealed,
          is_winner: isWinner,
        },
      });
    }

    const { data, error } = await supabase.rpc("reserve_scratch_result", {
      target_cell_id: cellId,
    });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "保留結果失敗" },
        { status: 500 }
      );
    }

    const isWinner =
      prizeNumbers.length > 0 &&
      prizeNumbers.includes(Number(data.revealed_number));

    return NextResponse.json({
      success: true,
      cell: {
        id: data.cell_id ?? cellId,
        revealed_number: data.revealed_number,
        draw_order: data.draw_order,
        revealed_at: data.revealed_at ?? null,
        is_revealed: false,
        is_winner: isWinner,
      },
    });
  } catch (error) {
    console.error("scratch preview error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}