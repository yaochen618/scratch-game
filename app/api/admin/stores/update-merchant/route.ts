import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { storeId, merchantId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
    }

    if (merchantId) {
      const { data: merchant, error: merchantError } = await supabase
        .from("merchant_accounts")
        .select("id")
        .eq("id", merchantId)
        .maybeSingle();

      if (merchantError || !merchant) {
        return NextResponse.json({ error: "商家帳號不存在" }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from("stores")
      .update({
        merchant_id: merchantId || null,
      })
      .eq("id", storeId);

    if (error) {
      return NextResponse.json(
        { error: error.message || "更新綁定失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "綁定已更新",
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