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

    const { data: cell, error: cellError } = await supabase
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

    if (cellError || !cell) {
      return NextResponse.json({ error: "找不到格子" }, { status: 404 });
    }

    if (cell.revealed_number === null || cell.draw_order === null) {
      return NextResponse.json(
        { error: "此格尚未保留結果，請重新進入頁面" },
        { status: 400 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("prize_numbers")
      .eq("id", cell.room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    const prizeNumbers = parsePrizeNumbers(room.prize_numbers);
    const isWinner =
      prizeNumbers.length > 0 &&
      prizeNumbers.includes(Number(cell.revealed_number));

    if (cell.is_revealed) {
      return NextResponse.json({
        success: true,
        cell: {
          id: cell.id,
          revealed_number: cell.revealed_number,
          draw_order: cell.draw_order,
          revealed_at: cell.revealed_at,
          is_winner: isWinner,
        },
      });
    }

    const now = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await supabase
      .from("cells")
      .update({
        is_revealed: true,
        revealed_at: now,
        is_winner: isWinner,
      })
      .eq("id", cellId)
      .eq("is_revealed", false)
      .select("id");

    if (updateError) {
      console.error("reveal update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      const { data: latestCell, error: latestCellError } = await supabase
        .from("cells")
        .select("id, room_id, revealed_number, draw_order, revealed_at")
        .eq("id", cellId)
        .single();

      if (latestCellError || !latestCell) {
        return NextResponse.json(
          { error: "格子狀態更新失敗" },
          { status: 409 }
        );
      }

      const latestPrizeNumbers = parsePrizeNumbers(room.prize_numbers);
      const latestIsWinner =
        latestPrizeNumbers.length > 0 &&
        latestPrizeNumbers.includes(Number(latestCell.revealed_number));

      return NextResponse.json({
        success: true,
        cell: {
          id: latestCell.id,
          revealed_number: latestCell.revealed_number,
          draw_order: latestCell.draw_order,
          revealed_at: latestCell.revealed_at,
          is_winner: latestIsWinner,
        },
      });
    }

    return NextResponse.json({
      success: true,
      cell: {
        id: cell.id,
        revealed_number: cell.revealed_number,
        draw_order: cell.draw_order,
        revealed_at: now,
        is_winner: isWinner,
      },
    });
  } catch (err) {
    console.error("reveal error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}