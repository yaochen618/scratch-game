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

export async function POST(req: Request, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;
    console.log("announcement storeSlug =", storeSlug);

    // 1. 先驗證商家登入 / 權限
    const access = await validateMerchantStoreAccess(storeSlug);
    console.log("announcement access =", access);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    // 2. 再驗證月租 / 啟用狀態
    const planResult = await getMerchantPlanStatusByStoreSlug(storeSlug);
    console.log("announcement planResult =", planResult);

    if (!planResult.ok) {
      return NextResponse.json(
        { error: planResult.error },
        { status: planResult.status }
      );
    }

    const body = await req.json();
    console.log("announcement body =", body);

    const announcement =
      typeof body?.announcement === "string" ? body.announcement : "";

    const { error } = await supabase
      .from("stores")
      .update({ announcement })
      .eq("id", access.store.id);

    if (error) {
      console.error("announcement update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("announcement POST unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "伺服器錯誤",
      },
      { status: 500 }
    );
  }
}