import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = body?.username?.trim();
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json(
        { error: "請輸入帳號與密碼" },
        { status: 400 }
      );
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_accounts")
      .select("id, username, password_hash, display_name, is_active")
      .eq("username", username)
      .maybeSingle();

    if (merchantError) {
      console.error("merchant query error:", merchantError);
      return NextResponse.json(
        { error: `讀取商家資料失敗：${merchantError.message}` },
        { status: 500 }
      );
    }

    if (!merchant) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    if (merchant.is_active === false) {
      return NextResponse.json(
        { error: "此帳號已停用" },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, merchant.password_hash);

    if (!ok) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      merchant: {
        id: merchant.id,
        username: merchant.username,
        display_name: merchant.display_name,
      },
    });

    res.cookies.set("merchant_id", merchant.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("merchant login unexpected error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? `登入失敗：${error.message}` : "登入失敗",
      },
      { status: 500 }
    );
  }
}