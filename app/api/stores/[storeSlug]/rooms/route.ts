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

function parsePrizeNumbers(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((number) => Number.isInteger(number));
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
      .select("id, name, slug, status, cell_count, prize_numbers, created_at")
      .eq("store_id", storeResult.store.id)
      .order("created_at", { ascending: false });

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    const roomIds = (rooms ?? []).map((room) => room.id);

    const revealedCountMap: Record<string, number> = {};
    const revealedPrizeCountMap: Record<string, number> = {};

    if (roomIds.length > 0) {
      const { data: cells, error: cellsError } = await supabase
        .from("cells")
        .select("room_id, is_revealed, revealed_number")
        .in("room_id", roomIds);

      if (cellsError) {
        return NextResponse.json(
          { error: cellsError.message },
          { status: 500 }
        );
      }

      for (const room of rooms ?? []) {
        const roomId = String(room.id);
        const prizeNumbers = parsePrizeNumbers(room.prize_numbers);

        revealedCountMap[roomId] = 0;
        revealedPrizeCountMap[roomId] = 0;

        for (const cell of cells ?? []) {
          if (String(cell.room_id) !== roomId) continue;

          if (cell.is_revealed) {
            revealedCountMap[roomId] += 1;

            if (prizeNumbers.includes(Number(cell.revealed_number))) {
              revealedPrizeCountMap[roomId] += 1;
            }
          }
        }
      }
    }

    const safeRooms = (rooms ?? []).map((room) => {
      const cellCount = room.cell_count ?? 0;
      const roomId = String(room.id);

      const revealedCount = revealedCountMap[roomId] ?? 0;
      const remainingCount = Math.max(cellCount - revealedCount, 0);

      const progressPercent =
        cellCount > 0 ? Math.round((revealedCount / cellCount) * 100) : 0;

      const prizeNumbers = parsePrizeNumbers(room.prize_numbers);
      const prizeTotalCount = prizeNumbers.length;

      const revealedPrizeCount = revealedPrizeCountMap[roomId] ?? 0;
      const remainingPrizeCount = Math.max(
        prizeTotalCount - revealedPrizeCount,
        0
      );

      const remainingPrizeRate =
        remainingCount > 0 && prizeTotalCount > 0
          ? Math.round((remainingPrizeCount / remainingCount) * 1000) / 10
          : 0;

      return {
        ...room,
        revealed_count: revealedCount,
        remaining_count: remainingCount,
        progress_percent: progressPercent,

        prize_total_count: prizeTotalCount,
        revealed_prize_count: revealedPrizeCount,
        remaining_prize_count: remainingPrizeCount,
        remaining_prize_rate: remainingPrizeRate,
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
    const prizeNumbersRaw = String(body?.prize_numbers || "").trim();

    const rawCellCount = String(
      body?.cellCount ?? body?.cell_count ?? ""
    ).trim();

    const cellCount = parseInt(rawCellCount, 10);

    if (!name) {
      return NextResponse.json(
        { error: "請輸入房間名稱" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(cellCount) || cellCount < 1 || cellCount > 1000) {
      return NextResponse.json(
        { error: "格數必須介於 1~1000" },
        { status: 400 }
      );
    }

    const prizeNumbers = parsePrizeNumbers(prizeNumbersRaw);

    if (prizeNumbersRaw && prizeNumbers.length === 0) {
      return NextResponse.json(
        { error: "中獎號碼格式不正確，請用逗號分隔，例如：1,5,6" },
        { status: 400 }
      );
    }

    const invalidPrizeNumber = prizeNumbers.some(
      (number) => number < 1 || number > cellCount
    );

    if (invalidPrizeNumber) {
      return NextResponse.json(
        { error: `中獎號碼必須介於 1~${cellCount}` },
        { status: 400 }
      );
    }

    const normalizedPrizeNumbers =
      prizeNumbers.length > 0 ? prizeNumbers.join(",") : null;

    const slug = await createUniqueRoomSlug(name);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        store_id: storeResult.store.id,
        name,
        slug,
        status: "draft",
        cell_count: cellCount,
        prize_numbers: normalizedPrizeNumbers,
      })
      .select("id, name, slug, status, cell_count, prize_numbers")
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
      is_winner: false,
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