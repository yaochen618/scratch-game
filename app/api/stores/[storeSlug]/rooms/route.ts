import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params:
    | Promise<{ storeSlug: string }>
    | { storeSlug: string };
};

async function getStoreSlug(context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  return resolvedParams?.storeSlug;
}

// 讀取商店與房間列表
export async function GET(_: Request, context: RouteContext) {
  try {
    const storeSlug = await getStoreSlug(context);

    if (!storeSlug) {
      return NextResponse.json({ error: "缺少店家資訊" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug, announcement")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到店家" }, { status: 404 });
    }

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id, name, slug, status, created_at, cell_count")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (roomsError) {
      return NextResponse.json({ error: "讀取房間失敗" }, { status: 500 });
    }

    return NextResponse.json({
      store,
      rooms: rooms ?? [],
    });
  } catch (error) {
    console.error("GET /rooms error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

// 建立房間
export async function POST(req: Request, context: RouteContext) {
  try {
    const storeSlug = await getStoreSlug(context);
    const body = await req.json();

    const roomName = String(body.name || "").trim();
    const requestedCellCount = Number(body.cell_count ?? 30);

    if (!storeSlug) {
      return NextResponse.json({ error: "缺少店家資訊" }, { status: 400 });
    }

    if (!roomName) {
      return NextResponse.json({ error: "請輸入房間名稱" }, { status: 400 });
    }

    if (
      !Number.isInteger(requestedCellCount) ||
      requestedCellCount < 1 ||
      requestedCellCount > 200
    ) {
      return NextResponse.json(
        { error: "格數必須為 1~200 的整數" },
        { status: 400 }
      );
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug, announcement")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到店家" }, { status: 404 });
    }

    const roomSlug = crypto.randomUUID().slice(0, 8);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        store_id: store.id,
        name: roomName,
        slug: roomSlug,
        status: "active",
        draw_mode: "uniform",
        cell_count: requestedCellCount,
      })
      .select()
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: roomError?.message || "建立房間失敗" },
        { status: 500 }
      );
    }

    const cells = Array.from({ length: requestedCellCount }, (_, i) => ({
      room_id: room.id,
      cell_index: i + 1,
      is_revealed: false,
      revealed_number: null,
      revealed_at: null,
    }));

    const { error: cellError } = await supabase
      .from("scratch_cells")
      .insert(cells);

    if (cellError) {
      return NextResponse.json({ error: cellError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("POST /rooms error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}