import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params:
    | Promise<{
        storeId: string;
      }>
    | {
        storeId: string;
      };
};

async function getStoreId(context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  return resolvedParams?.storeId;
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const storeId = await getStoreId(context);

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
    }

    const { data: store, error: findError } = await supabase
      .from("stores")
      .select("id, expires_at")
      .eq("id", storeId)
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
      .eq("id", storeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expires_at: currentExpire.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}