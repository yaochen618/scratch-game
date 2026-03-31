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

type SpecialModeRule = {
  after_draw: number;
  numbers: number[];
};

type SpecialMode = {
  enabled?: boolean;
  base_mode?: "room_range" | "custom_pool" | "auto_exclude_added";
  initial_pool?: number[];
  add_rules?: SpecialModeRule[];
};

async function getParams(context: RouteContext) {
  return await Promise.resolve(context.params);
}

function normalizeSpecialMode(input: unknown): SpecialMode | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as Record<string, unknown>;

  const baseMode =
    raw.base_mode === "custom_pool"
      ? "custom_pool"
      : raw.base_mode === "auto_exclude_added"
      ? "auto_exclude_added"
      : "room_range";

  const initialPool = Array.isArray(raw.initial_pool)
    ? raw.initial_pool
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const addRules = Array.isArray(raw.add_rules)
    ? raw.add_rules
        .map((rule) => {
          if (!rule || typeof rule !== "object") return null;

          const r = rule as Record<string, unknown>;
          const afterDraw = Number(r.after_draw);
          const numbers = Array.isArray(r.numbers)
            ? r.numbers
                .map((n) => Number(n))
                .filter((n) => Number.isInteger(n) && n > 0)
            : [];

          if (!Number.isInteger(afterDraw) || afterDraw < 0) return null;

          return {
            after_draw: afterDraw,
            numbers: [...new Set(numbers)],
          };
        })
        .filter((rule): rule is SpecialModeRule => rule !== null)
    : [];

  return {
    enabled: raw.enabled !== false,
    base_mode: baseMode,
    initial_pool: [...new Set(initialPool)],
    add_rules: addRules.sort((a, b) => a.after_draw - b.after_draw),
  };
}

function validateSpecialMode({
  drawMode,
  specialMode,
  cellCount,
}: {
  drawMode: string;
  specialMode: SpecialMode | null;
  cellCount: number;
}) {
  if (drawMode !== "special") {
    return { ok: true, message: "" };
  }

  if (!specialMode || specialMode.enabled === false) {
    return {
      ok: false,
      message: "特殊模式已啟用，但 special_mode 為空或未啟用",
    };
  }

  const baseMode = specialMode.base_mode ?? "room_range";
  const initialPool = specialMode.initial_pool ?? [];
  const addRules = specialMode.add_rules ?? [];

  if (baseMode === "custom_pool") {
    if (initialPool.length === 0) {
      return {
        ok: false,
        message: "custom_pool 模式下 initial_pool 不能為空",
      };
    }

    for (const n of initialPool) {
      if (!Number.isInteger(n) || n <= 0) {
        return {
          ok: false,
          message: "initial_pool 只能包含大於 0 的整數",
        };
      }
      if (n > cellCount) {
        return {
          ok: false,
          message: `initial_pool 的數字 ${n} 超過房間格數 ${cellCount}`,
        };
      }
    }
  }

  const initialSet = new Set<number>(initialPool);
  const addSeen = new Set<number>();

  for (const rule of addRules) {
    if (!Number.isInteger(rule.after_draw) || rule.after_draw < 0) {
      return {
        ok: false,
        message: "after_draw 必須是大於等於 0 的整數",
      };
    }

    if (!Array.isArray(rule.numbers) || rule.numbers.length === 0) {
      return {
        ok: false,
        message: "每筆 add_rules 都必須有 numbers",
      };
    }

    for (const n of rule.numbers) {
      if (!Number.isInteger(n) || n <= 0) {
        return {
          ok: false,
          message: "numbers 只能包含大於 0 的整數",
        };
      }

      if (n > cellCount) {
        return {
          ok: false,
          message: `numbers 的數字 ${n} 超過房間格數 ${cellCount}`,
        };
      }

      if (baseMode === "custom_pool" && initialSet.has(n)) {
        return {
          ok: false,
          message: `數字 ${n} 已存在於 initial_pool，不能再放進 add_rules`,
        };
      }

      if (addSeen.has(n)) {
        return {
          ok: false,
          message: `數字 ${n} 在 add_rules 中重複出現，這是不允許的`,
        };
      }

      addSeen.add(n);
    }
  }

  if (baseMode === "auto_exclude_added") {
    if (addSeen.size >= cellCount) {
      return {
        ok: false,
        message: "後續加入的數字已經覆蓋全部格數，初始獎池會變成空的",
      };
    }
  }

  return { ok: true, message: "" };
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
        { error: "找不到商店", detail: storeError?.message ?? null, storeSlug },
        { status: 404 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, slug, store_id, cell_count, force_rules, draw_mode, special_mode")
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "找不到房間", detail: roomError?.message ?? null, storeSlug, roomSlug },
        { status: 404 }
      );
    }

    if (room.store_id !== store.id) {
      return NextResponse.json(
        { error: "房間不屬於這個商店", storeSlug, roomSlug },
        { status: 400 }
      );
    }

    const { data: cells, error: cellsError } = await supabase
      .from("cells")
      .select("cell_index, is_revealed, revealed_number")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      return NextResponse.json(
        { error: "讀取格子失敗", detail: cellsError.message },
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
      draw_mode: room.draw_mode ?? "normal",
      special_mode: room.special_mode ?? null,
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

    const incomingDrawMode =
      body?.draw_mode === "special" ? "special" : "normal";

    const incomingSpecialMode = normalizeSpecialMode(body?.special_mode);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "找不到商店", detail: storeError?.message ?? null, storeSlug },
        { status: 404 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, slug, store_id, cell_count, force_rules, draw_mode, special_mode")
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "找不到房間", detail: roomError?.message ?? null, storeSlug, roomSlug },
        { status: 404 }
      );
    }

    if (room.store_id !== store.id) {
      return NextResponse.json(
        { error: "房間不屬於這個商店", storeSlug, roomSlug },
        { status: 400 }
      );
    }

    const { data: cells, error: cellsError } = await supabase
      .from("cells")
      .select("cell_index, is_revealed, revealed_number")
      .eq("room_id", room.id)
      .order("cell_index", { ascending: true });

    if (cellsError) {
      return NextResponse.json(
        { error: "讀取格子失敗", detail: cellsError.message },
        { status: 500 }
      );
    }

    const forceValidation = validateForceRules({
      rules: incomingRules,
      cells: cells ?? [],
      cellCount: room.cell_count,
      minNumber: 1,
      maxNumber: room.cell_count,
    });

    if (!forceValidation.ok) {
      return NextResponse.json({ error: forceValidation.message }, { status: 400 });
    }

    const specialValidation = validateSpecialMode({
      drawMode: incomingDrawMode,
      specialMode: incomingSpecialMode,
      cellCount: room.cell_count,
    });

    if (!specialValidation.ok) {
      return NextResponse.json({ error: specialValidation.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        force_rules: incomingRules,
        draw_mode: incomingDrawMode,
        special_mode: incomingDrawMode === "special" ? incomingSpecialMode : null,
      })
      .eq("id", room.id);

    if (updateError) {
      return NextResponse.json(
        { error: "更新規則失敗", detail: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      force_rules: incomingRules,
      draw_mode: incomingDrawMode,
      special_mode: incomingDrawMode === "special" ? incomingSpecialMode : null,
    });
  } catch (error) {
    console.error("PATCH force-rules error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}