import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _: Request,
  { params }: { params: { storeSlug: string; roomSlug: string } }
) {
  try {
    const { storeSlug, roomSlug } = params;

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, name, slug")
      .eq("store_id", store.id)
      .eq("slug", roomSlug)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "找不到房間" }, { status: 404 });
    }

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      room: {
        id: room.id,
        name: room.name,
        slug: room.slug,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}