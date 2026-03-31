import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _: Request,
  { params }: { params: { storeSlug: string } }
) {
  try {
    const { storeSlug } = params;

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
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}