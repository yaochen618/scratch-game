import { NextResponse } from "next/server";
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

export async function GET(
  req: Request,
  context: { params: Promise<{ storeSlug: string; roomSlug: string }> }
) {
  const { storeSlug, roomSlug } = await context.params;

  // 店家
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .single();

  if (!store) {
    return NextResponse.json(
      { error: "找不到店家" },
      { status: 404 }
    );
  }

  // 房間
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("slug", roomSlug)
    .eq("store_id", store.id)
    .single();

  if (!room) {
    return NextResponse.json(
      { error: "找不到房間" },
      { status: 404 }
    );
  }

  // 格子
  const { data: rawCells, error } = await supabase
    .from("cells")
    .select("*")
    .eq("room_id", room.id)
    .order("cell_index", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const prizeNumbers = parsePrizeNumbers(room.prize_numbers);

  const cells = (rawCells || []).map((cell) => {
    const isWinner =
      cell.is_revealed &&
      prizeNumbers.includes(Number(cell.revealed_number));

    return {
      ...cell,
      is_winner: isWinner,
    };
  });

  return NextResponse.json({
    room,
    cells,
  });
}