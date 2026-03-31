import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;

    if (!adminSession) {
      return NextResponse.json({ error: "未登入管理員" }, { status: 401 });
    }

    const { storeId } = params;
    const body = await req.json();

    const rawName = String(body?.name ?? "").trim();
    const rawSlug = String(body?.slug ?? "").trim();

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
    }

    if (!rawName) {
      return NextResponse.json({ error: "商店名稱不能空白" }, { status: 400 });
    }

    if (!rawSlug) {
      return NextResponse.json({ error: "slug 不能空白" }, { status: 400 });
    }

    const slug = normalizeSlug(rawSlug);

    if (!slug) {
      return NextResponse.json(
        { error: "slug 格式不合法，請只使用英文、數字、-、_" },
        { status: 400 }
      );
    }

    const { data: currentStore, error: currentStoreError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("id", storeId)
      .single();

    if (currentStoreError || !currentStore) {
      return NextResponse.json({ error: "找不到商店" }, { status: 404 });
    }

    const { data: duplicateSlugStore, error: duplicateSlugError } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .neq("id", storeId)
      .maybeSingle();

    if (duplicateSlugError) {
      return NextResponse.json(
        { error: "檢查 slug 時發生錯誤", detail: duplicateSlugError.message },
        { status: 500 }
      );
    }

    if (duplicateSlugStore) {
      return NextResponse.json(
        { error: "這個 slug 已經被使用" },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        name: rawName,
        slug,
      })
      .eq("id", storeId);

    if (updateError) {
      return NextResponse.json(
        { error: "更新失敗", detail: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "商店資料已更新",
      store: {
        id: storeId,
        name: rawName,
        slug,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "伺服器錯誤",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}