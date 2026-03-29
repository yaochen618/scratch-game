import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;
    const body = await req.json();

    const { name, slug, draw_mode } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "缺少 name 或 slug" },
        { status: 400 }
      );
    }

    // 1. 找 store
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, slug, announcement")
      .eq("slug", storeSlug)
      .single();

    if (!store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 2. 建立 room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        store_id: store.id,
        name,
        slug,
        status: "active",
        cell_count: 30,
        draw_mode: draw_mode || "uniform",
      })
      .select("id")
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "建立房間失敗", detail: roomError?.message },
        { status: 500 }
      );
    }

    // 3. 建立 30 格 cells
    const cells = Array.from({ length: 30 }, (_, i) => ({
      room_id: room.id,
      cell_index: i + 1,
      is_revealed: false,
      revealed_number: null,
      revealed_at: null,
    }));

    const { error: cellError } = await supabase
      .from("cells")
      .insert(cells);

    if (cellError) {
      return NextResponse.json(
        { error: "建立格子失敗", detail: cellError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId: room.id,
    });
  } catch (error) {
    console.error("create room error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}