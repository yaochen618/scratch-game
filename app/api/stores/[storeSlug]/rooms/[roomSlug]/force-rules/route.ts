import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  cleanupForceRules,
  normalizeForceRules,
  validateForceRules,
} from "@/lib/force-rules";

function isSystemAdmin(request: Request) {
  const adminKey = request.headers.get("x-system-admin-key");
  return adminKey === process.env.SYSTEM_ADMIN_KEY;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params:
    | Promise<{
        storeSlug: string;
        roomSlug: string;
      }>
    | {
        storeSlug: string;
        roomSlug: string;
      };
};

async function getParams(context: RouteContext) {
  return await Promise.resolve(context.params);
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    if (!isSystemAdmin(req)) {
      return NextResponse.json({ error: "無權限使用此功能" }, { status: 403 });
    }

    const { storeSlug, roomSlug } = await getParams(context);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          error: "找不到商店",
          detail: storeError?.message ?? null,
          storeSlug,
        },
        { status: 404 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, slug, store_id, cell_count, force_rules")
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        {
          error: "找不到房間",
          detail: roomError?.message ?? null,
          storeSlug,
          roomSlug,
        },
        { status: 404 }
      );
    }

    if (room.store_id !== store.id) {
      return NextResponse.json(
        {
          error: "房間不屬於這個商店",
          storeId: store.id,
          roomStoreId: room.store_id,
          storeSlug,
          roomSlug,
        },
        { status: 400 }
      );
    }

    const { data: cells, error: cellsError } = await supabase
      .from("cells")
      .select("cell_index, is_revealed, revealed_number")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      console.error("cellsError =", cellsError);
      return NextResponse.json(
        {
          error: "讀取格子失敗",
          detail: cellsError.message,
        },
        { status: 500 }
      );
    }

    const openedCells = (cells ?? []).filter((c) => c.is_revealed);
    const openedCellIndexes = openedCells.map((c) => c.cell_index);
    const usedNumbers = openedCells
      .map((c) => c.revealed_number)
      .filter((n): n is number => n !== null);

    return NextResponse.json({
      force_rules: normalizeForceRules(room.force_rules),
      cell_count: room.cell_count,
      current_draw_count: openedCells.length,
      opened_cell_indexes: openedCellIndexes,
      used_numbers: usedNumbers,
    });
  } catch (error) {
    console.error("GET force-rules error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    if (!isSystemAdmin(req)) {
      return NextResponse.json({ error: "無權限使用此功能" }, { status: 403 });
    }

    const { storeSlug, roomSlug } = await getParams(context);
    const body = await req.json();

    const incomingRules = cleanupForceRules(
      normalizeForceRules(body?.force_rules)
    );

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          error: "找不到商店",
          detail: storeError?.message ?? null,
          storeSlug,
        },
        { status: 404 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, slug, store_id, cell_count, force_rules")
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        {
          error: "找不到房間",
          detail: roomError?.message ?? null,
          storeSlug,
          roomSlug,
        },
        { status: 404 }
      );
    }

    if (room.store_id !== store.id) {
      return NextResponse.json(
        {
          error: "房間不屬於這個商店",
          storeId: store.id,
          roomStoreId: room.store_id,
          storeSlug,
          roomSlug,
        },
        { status: 400 }
      );
    }

    const { data: cells, error: cellsError } = await supabase
      .from("cells")
      .select("cell_index, is_revealed, revealed_number")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      console.error("cellsError =", cellsError);
      return NextResponse.json(
        {
          error: "讀取格子失敗",
          detail: cellsError.message,
        },
        { status: 500 }
      );
    }

    const validation = validateForceRules({
      rules: incomingRules,
      cells: cells ?? [],
      cellCount: room.cell_count,
      minNumber: 1,
      maxNumber: 30,
    });

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.message,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        force_rules: incomingRules,
      })
      .eq("id", room.id);

    if (updateError) {
      console.error("updateError =", updateError);
      return NextResponse.json(
        {
          error: "更新規則失敗",
          detail: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      force_rules: incomingRules,
    });
  } catch (error) {
    console.error("PATCH force-rules error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}