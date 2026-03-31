import { NextRequest, NextResponse } from "next/server";
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

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;

    if (!storeSlug) {
      return NextResponse.json({ error: "缺少 storeSlug" }, { status: 400 });
    }

    const { data: store, error: findError } = await supabase
      .from("stores")
      .select("id, expires_at")
      .eq("slug", storeSlug)
      .single();

    if (findError || !store) {
      return NextResponse.json({ error: "找不到商家" }, { status: 404 });
    }

    const now = new Date();
    const currentExpire =
      store.expires_at && new Date(store.expires_at).getTime() > now.getTime()
        ? new Date(store.expires_at)
        : now;

    currentExpire.setDate(currentExpire.getDate() + 30);

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        expires_at: currentExpire.toISOString(),
        is_active: true,
      })
      .eq("id", store.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expires_at: currentExpire.toISOString(),
    });
  } catch (error) {
    console.error("renew store error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}