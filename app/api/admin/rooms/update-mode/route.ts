import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { roomId, drawMode } = await req.json();

    if (!roomId || !drawMode) {
      return NextResponse.json(
        { error: "缺少參數" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("rooms")
      .update({ draw_mode: drawMode })
      .eq("id", roomId);

    if (error) {
      return NextResponse.json(
        { error: "更新失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "系統錯誤" },
      { status: 500 }
    );
  }
}