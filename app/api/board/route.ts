import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error("缺少 NEXT_PUBLIC_SUPABASE_URL");
      return NextResponse.json(
        { error: "缺少 NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      console.error("缺少 SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "缺少 SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", "demo-store")
      .single();

    if (storeError || !store) {
      console.error("讀取 stores 失敗:", storeError);
      return NextResponse.json(
        { error: "找不到 store", detail: storeError },
        { status: 404 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("id, status")
      .eq("store_id", store.id)
      .eq("status", "active")
      .single();

    if (sessionError || !session) {
      console.error("讀取 game_sessions 失敗:", sessionError);
      return NextResponse.json(
        { error: "找不到 active session", detail: sessionError },
        { status: 404 }
      );
    }

    const { data: cells, error: cellError } = await supabase
      .from("session_cells")
      .select("id, cell_index, is_revealed, revealed_number, draw_order, revealed_at")
      .eq("session_id", session.id)
      .order("cell_index", { ascending: true });

    if (cellError) {
      console.error("讀取 session_cells 失敗:", cellError);
      return NextResponse.json(
        { error: "讀取格子失敗", detail: cellError },
        { status: 500 }
      );
    }

    const safeCells = (cells || []).map((cell) => ({
      id: cell.id,
      cell_index: cell.cell_index,
      is_revealed: cell.is_revealed,
      revealed_number: cell.is_revealed ? cell.revealed_number : null,
      draw_order: cell.is_revealed ? cell.draw_order : null,
      revealed_at: cell.is_revealed ? cell.revealed_at : null,
    }));

    return NextResponse.json({
      sessionId: session.id,
      cells: safeCells,
    });
  } catch (error) {
    console.error("API /api/board 發生例外:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}