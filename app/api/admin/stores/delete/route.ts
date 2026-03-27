import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      return NextResponse.json(
        { error: error.message || "刪除商店失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "商店已刪除",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "系統錯誤",
      },
      { status: 500 }
    );
  }
}