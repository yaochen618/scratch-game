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

    const {
      name,
      slug,
      draw_mode,
      cell_count,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "缺少 name 或 slug" },
        { status: 400 }
      );
    }

    const cellCount = Number(cell_count);

    if (
      !Number.isInteger(cellCount) ||
      cellCount < 1 ||
      cellCount > 1000
    ) {
      return NextResponse.json(
        { error: "格數必須介於 1 ~ 1000" },
        { status: 400 }
      );
    }

    // 找商店
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, slug, announcement")
      .eq("slug", storeSlug)
      .single();

    if (!store) {
      return NextResponse.json(
        { error: "找不到商店" },
        { status: 404 }
      );
    }

    // 建立房間
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        store_id: store.id,
        name,
        slug,
        status: "active",
        cell_count: cellCount,
        draw_mode: draw_mode || "uniform",
      })
      .select("id")
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        {
          error: "建立房間失敗",
          detail: roomError?.message,
        },
        { status: 500 }
      );
    }

    // 建立對應數量格子
    const cells = Array.from(
      { length: cellCount },
      (_, i) => ({
        room_id: room.id,
        cell_index: i + 1,
        is_revealed: false,
        revealed_number: null,
        revealed_at: null,
      })
    );

    const { error: cellError } = await supabase
      .from("cells")
      .insert(cells);

    if (cellError) {
      return NextResponse.json(
        {
          error: "建立格子失敗",
          detail: cellError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId: room.id,
      cellCount,
    });
  } catch (error) {
    console.error("create room error:", error);

    return NextResponse.json(
      { error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}