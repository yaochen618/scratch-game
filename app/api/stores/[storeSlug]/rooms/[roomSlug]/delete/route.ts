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

export async function POST(_: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;

    // 1. 找商店
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 2. 找房間
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    // 3. 先刪除 scratch_cells
    const { error: cellsDeleteError } = await supabase
      .from("scratch_cells")
      .delete()
      .eq("room_id", room.id);

    if (cellsDeleteError) {
      return NextResponse.json(
        { error: "刪除格子失敗", detail: cellsDeleteError.message },
        { status: 500 }
      );
    }

    // 4. 如有 game_sessions，也一起刪掉
    const { error: sessionsDeleteError } = await supabase
      .from("game_sessions")
      .delete()
      .eq("room_id", room.id);

    if (sessionsDeleteError) {
      return NextResponse.json(
        { error: "刪除 session 失敗", detail: sessionsDeleteError.message },
        { status: 500 }
      );
    }

    // 5. 最後刪房間
    const { error: roomDeleteError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id);

    if (roomDeleteError) {
      return NextResponse.json(
        { error: "刪除房間失敗", detail: roomDeleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "刪除成功",
    });
  } catch (error) {
    console.error("delete room error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}