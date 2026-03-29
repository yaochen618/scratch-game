import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // 1. 找 store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", "demo-store")
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "找不到 store" },
        { status: 404 }
      );
    }

    // 2. 找目前 active session
    const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .select("id, status, created_at")
        .eq("store_id", store.id)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "找不到 active session" },
        { status: 404 }
      );
    }

    // 3. 重置所有格子
    const { error: resetCellsError } = await supabase
      .from("session_cells")
      .update({
        is_revealed: false,
        revealed_number: null,
        draw_order: null,
        revealed_at: null,
      })
      .eq("session_id", session.id);

    if (resetCellsError) {
      return NextResponse.json(
        { error: "重置格子失敗" },
        { status: 500 }
      );
    }

    // 4. 重置 session 狀態
    const { error: resetSessionError } = await supabase
      .from("game_sessions")
      .update({
        status: "active",
      })
      .eq("id", session.id);

    if (resetSessionError) {
      return NextResponse.json(
        { error: "重置 session 失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "刮板已重置",
    });
  } catch (error) {
    console.error("reset error:", error);
    return NextResponse.json(
      { error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}