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

    // 1. 找商店
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 2. 找房間 / 刮板
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, draw_mode")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到刮板" }, { status: 404 });
    }

    // 3. session 可以保留查詢，但改成非必須
    const { data: session } = await supabase
      .from("game_sessions")
      .select("id, status, created_at")
      .eq("store_id", store.id)
      .eq("room_id", room.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. 直接讀 scratch_cells（真正的刮板格子）
    const { data: cells, error: cellsError } = await supabase
      .from("scratch_cells")
      .select("id, cell_index, is_revealed, revealed_number, revealed_at")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      console.error("讀取 scratch_cells 失敗:", cellsError);
      return NextResponse.json({ error: "讀取格子失敗" }, { status: 500 });
    }

    console.log("========== BOARD DEBUG ==========");
    console.log("storeSlug =", storeSlug);
    console.log("roomSlug =", roomSlug);
    console.log("room.id =", room.id);
    console.log("cells length =", cells?.length);
    console.log(
      "cell indexes =",
      (cells || []).map((c) => c.cell_index).sort((a, b) => a - b)
    );
    console.log("=================================");

    // 5. 轉成前端目前使用的欄位名稱
    const safeCells = (cells || []).map((cell) => ({
      id: cell.id,
      cell_index: cell.cell_index,
      revealed_number: cell.is_revealed ? cell.revealed_number : null,
      opened_at: cell.revealed_at,
    }));

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      room: {
        id: room.id,
        name: room.name,
        slug: room.slug,
        status: room.status,
      },
      session: session
        ? {
            id: session.id,
            status: session.status,
          }
        : null,
      cells: safeCells,
    });
  } catch (error) {
    console.error("GET board error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}