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
    roomSlug: string;
  }>;
};

async function getMerchantPlanStatusByStoreSlug(storeSlug: string) {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active, merchant_id")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return {
      ok: false as const,
      status: 404,
      error: "找不到商店",
      store: null,
      merchant: null,
    };
  }

  if (!store.is_active) {
    return {
      ok: false as const,
      status: 403,
      error: "此店家目前未開放",
      store,
      merchant: null,
    };
  }

  if (!store.merchant_id) {
    return {
      ok: false as const,
      status: 403,
      error: "此店家尚未綁定商家",
      store,
      merchant: null,
    };
  }

  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_accounts")
    .select("id, is_active, billing_status, expires_at")
    .eq("id", store.merchant_id)
    .single();

  if (merchantError || !merchant) {
    return {
      ok: false as const,
      status: 500,
      error: "商家資料異常",
      store,
      merchant: null,
    };
  }

  const canUse = isMerchantPlanAvailable({
    is_active: merchant.is_active,
    billing_status: merchant.billing_status,
    expires_at: merchant.expires_at,
  });

  if (!canUse) {
    return {
      ok: false as const,
      status: 403,
      error: "此店家目前未開放使用",
      store,
      merchant,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null,
    store,
    merchant,
  };
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;

    if (!storeSlug || !roomSlug) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    // 1. 驗證商家登入 / 是否有權限操作這家店
    const access = await validateMerchantStoreAccess(storeSlug);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // 2. 驗證月租 / 啟用狀態
    const planResult = await getMerchantPlanStatusByStoreSlug(storeSlug);

    if (!planResult.ok) {
      return NextResponse.json(
        { error: planResult.error },
        { status: planResult.status }
      );
    }

    // 3. 找房間
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug")
      .eq("store_id", planResult.store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    // 4. 先刪 cells
    const { error: cellsDeleteError } = await supabase
      .from("cells")
      .delete()
      .eq("room_id", room.id);

    if (cellsDeleteError) {
      return NextResponse.json(
        { error: "刪除格子失敗", detail: cellsDeleteError.message },
        { status: 500 }
      );
    }

    // 5. 再刪 game_sessions
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

    // 6. 最後刪 rooms
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