import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateMerchantRoomAccess } from "@/lib/merchant-api-auth";

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

export async function POST(_: Request, context: RouteContext) {
  try {
    const { storeSlug, roomSlug } = await context.params;

    const access = await validateMerchantRoomAccess(storeSlug, roomSlug);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { error: resetCellsError } = await supabase
      .from("cells")
      .update({
        is_revealed: false,
        revealed_number: null,
        revealed_at: null,
      })
      .eq("room_id", access.room.id);

    if (resetCellsError) {
      return NextResponse.json(
        { error: resetCellsError.message },
        { status: 500 }
      );
    }

    const { error: resetSessionError } = await supabase
      .from("game_sessions")
      .delete()
      .eq("room_id", access.room.id);

    if (resetSessionError) {
      return NextResponse.json(
        { error: resetSessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset room POST error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}