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

    const { data, error } = await supabase.rpc("reveal_cell", {
      p_cell_id: cellId,
    });

    if (error) {
      console.error("reveal rpc error:", error);
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
        revealed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("reveal error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}