import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateMerchantStoreAccess } from "@/lib/merchant-api-auth";
import { isMerchantPlanAvailable } from "@/lib/merchant-plan";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    storeSlug: string;
  }>;
};

function makeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_一-龥]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueRoomSlug(baseName: string) {
  const baseSlug = makeSlug(baseName) || `room-${Date.now()}`;

  const { data: existingRooms, error } = await supabase
    .from("rooms")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`查詢 slug 失敗：${error.message}`);
  }

  const usedSlugs = new Set((existingRooms ?? []).map((item) => item.slug));

  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (usedSlugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

async function getStoreBySlug(storeSlug: string) {
  const { data: store, error } = await supabase
    .from("stores")
    .select(
      "id, name, slug, announcement, is_active, billing_status, expires_at"
    )
    .eq("slug", storeSlug)
    .single();

  if (error || !store) {
    return {
      ok: false as const,
      status: 404,
      error: "找不到店家",
      store: null,
    };
  }

  if (!isMerchantPlanAvailable(store)) {
    return {
      ok: false as const,
      status: 403,
      error: "此店家目前無法使用",
      store,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    store,
  };
}

// 顧客端：取得房間列表（含刮卡進度）
export async function GET(_: Request, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;

    const storeResult = await getStoreBySlug(storeSlug);

    if (!storeResult.ok) {
      return NextResponse.json(
        { error: storeResult.error },
        { status: storeResult.status }
      );
    }

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, cell_count, created_at")
      .eq("store_id", storeResult.store.id)
      .order("created_at", { ascending: false });

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    const roomIds = (rooms ?? []).map((room) => room.id);

    const revealedCountMap: Record<string, number> = {};

    if (roomIds.length > 0) {
      const { data: cells, error: cellsError } = await supabase
        .from("cells")
        .select("room_id, is_revealed")
        .in("room_id", roomIds);

      if (cellsError) {
        return NextResponse.json(
          { error: cellsError.message },
          { status: 500 }
        );
      }

      for (const cell of cells ?? []) {
        const roomId = String(cell.room_id);

        if (!revealedCountMap[roomId]) {
          revealedCountMap[roomId] = 0;
        }

        if (cell.is_revealed) {
          revealedCountMap[roomId] += 1;
        }
      }
    }

    const safeRooms = (rooms ?? []).map((room) => {
      const cellCount = room.cell_count ?? 0;
      const revealedCount = revealedCountMap[String(room.id)] ?? 0;
      const remainingCount = Math.max(cellCount - revealedCount, 0);
      const progressPercent =
        cellCount > 0 ? Math.round((revealedCount / cellCount) * 100) : 0;

      return {
        ...room,
        revealed_count: revealedCount,
        remaining_count: remainingCount,
        progress_percent: progressPercent,
      };
    });

    return NextResponse.json({
      success: true,
      store: {
        id: storeResult.store.id,
        name: storeResult.store.name,
        slug: storeResult.store.slug,
        announcement: storeResult.store.announcement,
      },
      rooms: safeRooms,
    });
  } catch (error) {
    console.error("rooms GET error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// 商家端：建立房間
export async function POST(req: Request, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;

    const access = await validateMerchantStoreAccess(storeSlug);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const storeResult = await getStoreBySlug(storeSlug);

    if (!storeResult.ok) {
      return NextResponse.json(
        { error: storeResult.error },
        { status: storeResult.status }
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();

    const rawCellCount = String(
      body?.cellCount ?? body?.cell_count ?? ""
    ).trim();
    const cellCount = parseInt(rawCellCount, 10);

    const allowedCellCounts = [6, 9, 15, 20, 25, 30, 40, 50, 60, 100, 120, 200];

    if (!name) {
      return NextResponse.json({ error: "請輸入房間名稱" }, { status: 400 });
    }

    if (!Number.isInteger(cellCount) || !allowedCellCounts.includes(cellCount)) {
      return NextResponse.json({ error: "格數不正確" }, { status: 400 });
    }

    const slug = await createUniqueRoomSlug(name);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        store_id: storeResult.store.id,
        name,
        slug,
        status: "draft",
        cell_count: cellCount,
      })
      .select("id, name, slug, status, cell_count")
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: roomError?.message || "建立房間失敗" },
        { status: 500 }
      );
    }

    const cells = Array.from({ length: cellCount }, (_, i) => ({
      room_id: room.id,
      cell_index: i + 1,
      is_revealed: false,
      revealed_number: null,
    }));

    const { error: cellError } = await supabase.from("cells").insert(cells);

    if (cellError) {
      await supabase.from("rooms").delete().eq("id", room.id);

      return NextResponse.json(
        { error: `建立格子失敗：${cellError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "房間建立成功",
      room,
    });
  } catch (error) {
    console.error("rooms POST error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "伺服器錯誤",
      },
      { status: 500 }
    );
  }
}