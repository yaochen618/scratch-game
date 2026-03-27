import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params:
    | Promise<{
        storeSlug: string;
      }>
    | {
        storeSlug: string;
      };
};

async function getStoreSlug(context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  return resolvedParams?.storeSlug;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const storeSlug = await getStoreSlug(context);

    if (!storeSlug) {
      return NextResponse.json({ error: "缺少 storeSlug" }, { status: 400 });
    }

    const body = await request.json();
    const announcement = String(body.announcement ?? "").trim();

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("stores")
      .update({ announcement })
      .eq("id", store.id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "更新公告失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("announcement POST error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}