import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { merchantId } = await req.json();

    if (!merchantId) {
      return NextResponse.json(
        { error: "缺少 merchantId" },
        { status: 400 }
      );
    }

    // 1️⃣ 先把店家解除綁定
    await supabase
      .from("stores")
      .update({ merchant_id: null })
      .eq("merchant_id", merchantId);

    // 2️⃣ 刪除帳號
    const { error } = await supabase
      .from("merchant_accounts")
      .delete()
      .eq("id", merchantId);

    if (error) {
      return NextResponse.json(
        { error: "刪除失敗" },
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