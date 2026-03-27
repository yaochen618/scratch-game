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
    const { name, slug, merchantId } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "請完整填寫商店名稱與 slug" }, { status: 400 });
    }

    const finalSlug = normalizeSlug(slug);

    if (!finalSlug) {
      return NextResponse.json({ error: "slug 格式不正確" }, { status: 400 });
    }

    const { data: existed } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existed) {
      return NextResponse.json({ error: "此 slug 已存在" }, { status: 400 });
    }

    if (merchantId) {
      const { data: merchant, error: merchantError } = await supabase
        .from("merchant_accounts")
        .select("id")
        .eq("id", merchantId)
        .maybeSingle();

      if (merchantError || !merchant) {
        return NextResponse.json({ error: "綁定的商家帳號不存在" }, { status: 400 });
      }
    }

    const { data: store, error } = await supabase
      .from("stores")
      .insert({
        name: name.trim(),
        slug: finalSlug,
        merchant_id: merchantId || null,
      })
      .select("id, name, slug, merchant_id")
      .single();

    if (error || !store) {
      return NextResponse.json(
        { error: error?.message || "建立商店失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "商店建立成功",
      store,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `系統錯誤：${error.message}` : "系統錯誤",
      },
      { status: 500 }
    );
  }
}