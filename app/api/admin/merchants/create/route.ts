import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { display_name, username, password, storeSlug } = await req.json();

    if (!display_name || !username || !password || !storeSlug) {
      return NextResponse.json(
        { error: "請完整填寫資料" },
        { status: 400 }
      );
    }

    const { data: existed } = await supabase
      .from("merchant_accounts")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existed) {
      return NextResponse.json({ error: "此帳號已存在" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, merchant_id")
      .eq("slug", storeSlug)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "找不到要綁定的店家" },
        { status: 404 }
      );
    }

    if (store.merchant_id) {
      return NextResponse.json(
        { error: "這間店已經綁定商家帳號" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_accounts")
      .insert({
        display_name,
        username,
        password_hash: passwordHash,
      })
      .select("id, display_name, username")
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: merchantError?.message || "建立商家帳號失敗" },
        { status: 500 }
      );
    }

    const { error: updateStoreError } = await supabase
      .from("stores")
      .update({
        merchant_id: merchant.id,
      })
      .eq("id", store.id);

    if (updateStoreError) {
      return NextResponse.json(
        { error: "商家帳號已建立，但綁定店家失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "商家帳號建立成功",
      merchant,
    });
  } catch {
    return NextResponse.json(
      { error: "系統錯誤，建立失敗" },
      { status: 500 }
    );
  }
}