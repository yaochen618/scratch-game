import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { isMerchantPlanAvailable } from "@/lib/merchant-plan";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function validateMerchantStoreAccess(storeSlug: string) {
  try {
    const cookieStore = await cookies();

    const merchantId =
      cookieStore.get("merchant_id")?.value ||
      cookieStore.get("merchant_session")?.value;

    if (!merchantId) {
      return {
        ok: false as const,
        status: 401,
        error: "未登入",
      };
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_accounts")
      .select("id, username, display_name, is_active, billing_status, expires_at")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      console.error("validateMerchantStoreAccess merchant error:", merchantError);
      return {
        ok: false as const,
        status: 401,
        error: "找不到商家資料",
      };
    }

    const canUse = isMerchantPlanAvailable({
      is_active: merchant.is_active,
      billing_status: merchant.billing_status,
      expires_at: merchant.expires_at,
    });

    if (!canUse) {
      return {
        ok: false as const,
        status: 403,
        error: "方案已到期或帳號不可使用",
      };
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug, merchant_id, is_active, announcement")
      .eq("slug", storeSlug)
      .eq("merchant_id", merchant.id)
      .single();

    if (storeError || !store) {
      console.error("validateMerchantStoreAccess store error:", storeError);
      return {
        ok: false as const,
        status: 403,
        error: "找不到商家或你沒有權限",
      };
    }

    return {
      ok: true as const,
      merchant,
      store,
    };
  } catch (error) {
    console.error("validateMerchantStoreAccess unexpected error:", error);
    return {
      ok: false as const,
      status: 500,
      error: "商家驗證失敗",
    };
  }
}

export async function validateMerchantRoomAccess(
  storeSlug: string,
  roomSlug?: string,
  roomId?: string
) {
  try {
    const access = await validateMerchantStoreAccess(storeSlug);

    if (!access.ok) {
      return access;
    }

    let query = supabase
      .from("rooms")
      .select("id, name, slug, status, cell_count, store_id")
      .eq("store_id", access.store.id);

    if (roomSlug) {
      query = query.eq("slug", roomSlug);
    }

    if (roomId) {
      query = query.eq("id", roomId);
    }

    const { data: room, error: roomError } = await query.single();

    if (roomError || !room) {
      console.error("validateMerchantRoomAccess room error:", roomError);
      return {
        ok: false as const,
        status: 403,
        error: "找不到房間或你沒有權限",
      };
    }

    return {
      ok: true as const,
      merchant: access.merchant,
      store: access.store,
      room,
    };
  } catch (error) {
    console.error("validateMerchantRoomAccess unexpected error:", error);
    return {
      ok: false as const,
      status: 500,
      error: "房間驗證失敗",
    };
  }
}