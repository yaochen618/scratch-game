import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const slug = normalizeSlug(String(body.slug ?? ""));

    if (!name) {
      return NextResponse.json({ error: "請輸入商店名稱" }, { status: 400 });
    }

    if (!slug) {
      return NextResponse.json({ error: "請輸入有效的 slug" }, { status: 400 });
    }

    const { data: existingStore, error: checkError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingStore) {
      return NextResponse.json({ error: "這個 slug 已存在" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: insertError } = await supabase.from("stores").insert({
      name,
      slug,
      is_active: true,
      plan_type: "basic",
      billing_status: "active",
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "商店建立成功，已自動開通 30 天",
    });
  } catch {
    return NextResponse.json({ error: "建立商店失敗" }, { status: 500 });
  }
}