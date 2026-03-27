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

    if (!storeSlug || !roomSlug) {
      return NextResponse.json(
        { error: "缺少 storeSlug 或 roomSlug" },
        { status: 400 }
      );
    }

    // 1. 找商店
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 2. 找房間，記得把 cell_count 一起查出來
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, slug, cell_count")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    const cellCount = room.cell_count ?? 30;

    // 額外保護，避免資料異常
    if (!Number.isInteger(cellCount) || cellCount < 1 || cellCount > 100) {
      return NextResponse.json(
        { error: "房間格數設定異常" },
        { status: 400 }
      );
    }

    // 3. 讀取目前所有格子
    const { data: existingCells, error: existingError } = await supabase
      .from("scratch_cells")
      .select("id, cell_index")
      .eq("room_id", room.id);

    if (existingError) {
      return NextResponse.json(
        { error: "讀取格子失敗", detail: existingError.message },
        { status: 500 }
      );
    }

    const existingIndexes = new Set(
      (existingCells || []).map((cell) => cell.cell_index)
    );

    // 4. 補齊應有的格子數
    const missingRows = [];
    for (let i = 1; i <= cellCount; i++) {
      if (!existingIndexes.has(i)) {
        missingRows.push({
          room_id: room.id,
          cell_index: i,
          is_revealed: false,
          revealed_number: null,
          revealed_at: null,
        });
      }
    }

    if (missingRows.length > 0) {
      const { error: insertError } = await supabase
        .from("scratch_cells")
        .insert(missingRows);

      if (insertError) {
        return NextResponse.json(
          { error: "補齊格子失敗", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    // 5. 如果原本有超出 cell_count 的格子，刪掉
    const extraIndexes = (existingCells || [])
      .filter((cell) => cell.cell_index > cellCount)
      .map((cell) => cell.id);

    if (extraIndexes.length > 0) {
      const { error: deleteError } = await supabase
        .from("scratch_cells")
        .delete()
        .in("id", extraIndexes);

      if (deleteError) {
        return NextResponse.json(
          { error: "刪除多餘格子失敗", detail: deleteError.message },
          { status: 500 }
        );
      }
    }

    // 6. 重設目前有效範圍內的格子
    const { error: resetError } = await supabase
      .from("scratch_cells")
      .update({
        is_revealed: false,
        revealed_number: null,
        revealed_at: null,
      })
      .eq("room_id", room.id)
      .lte("cell_index", cellCount);

    if (resetError) {
      return NextResponse.json(
        { error: "重製失敗", detail: resetError.message },
        { status: 500 }
      );
    }

    console.log("RESET SUCCESS:", {
      storeSlug,
      roomSlug,
      roomId: room.id,
      cellCount,
    });

    return NextResponse.json({
      success: true,
      message: "刮板已重製",
      cell_count: cellCount,
    });
  } catch (error) {
    console.error("POST reset error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}