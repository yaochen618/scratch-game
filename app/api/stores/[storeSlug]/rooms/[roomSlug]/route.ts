import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  context: { params: Promise<{ storeSlug: string; roomSlug: string }> }
) {
  const { storeSlug, roomSlug } = await context.params;

  // 1. 找 store
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .single();

  if (!store) {
    return NextResponse.json({ error: "找不到店家" }, { status: 404 });
  }

  // 2. 找 room
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("slug", roomSlug)
    .eq("store_id", store.id)
    .single();

  if (!room) {
    return NextResponse.json({ error: "找不到房間" }, { status: 404 });
  }

  // 3. 找 cells
  const { data: cells, error } = await supabase
    .from("cells")
    .select("*")
    .eq("room_id", room.id)
    .order("cell_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    room,
    cells,
  });
}