import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { merchantId, isActive } = await req.json();

    if (!merchantId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "參數錯誤" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("merchant_accounts")
      .update({
        is_active: isActive,
      })
      .eq("id", merchantId);

    if (error) {
      return NextResponse.json(
        { error: "更新狀態失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "系統錯誤" },
      { status: 500 }
    );
  }
}