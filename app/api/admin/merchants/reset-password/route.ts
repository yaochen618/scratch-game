import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { merchantId, newPassword } = await req.json();

    if (!merchantId || !newPassword) {
      return NextResponse.json(
        { error: "缺少必要資料" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from("merchant_accounts")
      .update({
        password_hash: passwordHash,
      })
      .eq("id", merchantId);

    if (error) {
      return NextResponse.json(
        { error: "更新密碼失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "密碼已更新",
    });
  } catch {
    return NextResponse.json(
      { error: "系統錯誤" },
      { status: 500 }
    );
  }
}