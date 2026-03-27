import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: stores, error } = await supabase
      .from("stores")
      .select("id, name, slug")
      .order("id", { ascending: true });

    if (error) {
      console.error("讀取 stores 失敗:", error);
      return NextResponse.json(
        {
          error: "讀取商店失敗",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stores: stores || [],
    });
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}