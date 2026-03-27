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

export async function GET(_: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;

    if (!storeSlug || !roomSlug) {
      return NextResponse.json(
        { error: "缺少 storeSlug 或 roomSlug" },
        { status: 400 }
      );
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, cell_count")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到刮板" }, { status: 404 });
    }

    const { data: cells, error: cellsError } = await supabase
      .from("scratch_cells")
      .select("id, cell_index, is_revealed, revealed_number, revealed_at")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      return NextResponse.json({ error: "讀取格子失敗" }, { status: 500 });
    }

    return NextResponse.json({
      room,
      cells: cells ?? [],
    });
  } catch (error) {
    console.error("GET room detail error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}