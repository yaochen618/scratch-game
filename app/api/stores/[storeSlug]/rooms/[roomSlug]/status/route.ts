import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;
    const body = await req.json();
    const newStatus = body?.status;

    if (!["draft", "active"].includes(newStatus)) {
      return NextResponse.json(
        { error: "狀態不合法" },
        { status: 400 }
      );
    }

    // 找 store
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", storeSlug)
      .single();

    if (!store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    // 更新 room
    const { error } = await supabase
      .from("rooms")
      .update({ status: newStatus })
      .eq("store_id", store.id)
      .eq("slug", roomSlug);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json(
      { error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}