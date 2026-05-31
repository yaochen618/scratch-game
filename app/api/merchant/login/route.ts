import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { error: `讀取商家帳號失敗：${merchantError.message}` },
        { status: 500 }
      );
    }

    if (merchant) {
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

      const { data: stores, error: storeError } = await supabase
        .from("stores")
        .select("id, slug, name, is_active, expires_at")
        .eq("merchant_id", merchant.id)
        .order("name", { ascending: true });

      if (storeError) {
        return NextResponse.json(
          { error: `讀取店家資料失敗：${storeError.message}` },
          { status: 500 }
        );
      }

      if (!stores || stores.length === 0) {
        return NextResponse.json(
          { error: "此商家帳號尚未綁定店家" },
          { status: 404 }
        );
      }

      const firstStore = stores[0];

      const { data: staffRole } = await supabase
        .from("store_staff")
        .select(
          "id, store_id, username, can_manage_special_rules, can_manage_special_mode, is_active"
        )
        .eq("username", merchant.username)
        .eq("is_active", true)
        .maybeSingle();

      const res = NextResponse.json({
        success: true,
        type: staffRole ? "merchant_staff" : "merchant",
        merchant: {
          id: merchant.id,
          username: merchant.username,
          display_name: merchant.display_name,
          storeSlug: firstStore.slug,
          storeName: firstStore.name,
          stores,
        },
        staff: staffRole
          ? {
              id: staffRole.id,
              username: staffRole.username,
              storeSlug: firstStore.slug,
              storeName: firstStore.name,
              can_manage_special_rules: staffRole.can_manage_special_rules,
              can_manage_special_mode: staffRole.can_manage_special_mode,
            }
          : null,
      });

      res.cookies.set("merchant_id", String(merchant.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      res.cookies.set("merchant_store_slug", firstStore.slug, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      if (staffRole) {
        res.cookies.set("staff_session", String(staffRole.id), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      } else {
        res.cookies.delete("staff_session");
      }

      return res;
    }

    const { data: staff, error: staffError } = await supabase
      .from("store_staff")
      .select(
        "id, store_id, username, password_hash, can_manage_special_rules, can_manage_special_mode, is_active"
      )
      .eq("username", username)
      .maybeSingle();

    if (staffError) {
      return NextResponse.json(
        { error: `讀取特殊身分資料失敗：${staffError.message}` },
        { status: 500 }
      );
    }

    if (!staff) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    if (staff.is_active === false) {
      return NextResponse.json(
        { error: "此帳號已停用" },
        { status: 403 }
      );
    }

    const staffPasswordOk = password === staff.password_hash;

    if (!staffPasswordOk) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, slug, name, merchant_id, is_active, expires_at")
      .eq("id", staff.store_id)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "此特殊身分尚未綁定有效店家" },
        { status: 404 }
      );
    }

    if (!store.merchant_id) {
      return NextResponse.json(
        { error: "此店家尚未綁定商家帳號，無法給予一般商家功能" },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      success: true,
      type: "staff",
      staff: {
        id: staff.id,
        username: staff.username,
        storeSlug: store.slug,
        storeName: store.name,
        merchantId: store.merchant_id,
        can_manage_special_rules: staff.can_manage_special_rules,
        can_manage_special_mode: staff.can_manage_special_mode,
      },
    });

    res.cookies.set("staff_session", String(staff.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("merchant_id", String(store.merchant_id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("merchant_store_slug", store.slug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `登入失敗：${error.message}` : "登入失敗",
      },
      { status: 500 }
    );
  }
}