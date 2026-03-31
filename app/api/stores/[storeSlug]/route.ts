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

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { storeSlug } = await context.params;

    const { data: store, error } = await supabase
      .from("stores")
      .select("name")
      .eq("slug", storeSlug)
      .single();

    if (error || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error("store GET error:", error);

    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}