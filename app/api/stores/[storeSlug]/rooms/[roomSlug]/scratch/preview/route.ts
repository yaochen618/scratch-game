import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cellId } = body;

    if (!cellId) {
      return NextResponse.json({ error: "缺少 cellId" }, { status: 400 });
    }

    // 先看目前這格有沒有已保留的結果
    const { data: currentCell, error: currentCellError } = await supabase
      .from("cells")
      .select("id, revealed_number, draw_order, is_revealed, revealed_at")
      .eq("id", cellId)
      .single();

    if (currentCellError || !currentCell) {
      return NextResponse.json({ error: "找不到格子" }, { status: 404 });
    }

    // 如果已經有保留好的結果，直接回傳
    if (
      currentCell.revealed_number !== null &&
      currentCell.draw_order !== null
    ) {
      return NextResponse.json({
        success: true,
        cell: {
          id: currentCell.id,
          revealed_number: currentCell.revealed_number,
          draw_order: currentCell.draw_order,
          revealed_at: currentCell.revealed_at,
          is_revealed: currentCell.is_revealed,
        },
      });
    }

    // 沒有結果時，呼叫新的 reserve function
    const { data, error } = await supabase.rpc("reserve_cell_result", {
      p_cell_id: cellId,
    });

    if (error) {
      console.error("reserve_cell_result rpc error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      cell: {
        id: data.cell_id ?? cellId,
        revealed_number: data.revealed_number,
        draw_order: data.draw_order,
        revealed_at: data.revealed_at ?? null,
        is_revealed: false,
      },
    });
  } catch (err) {
    console.error("preview error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}