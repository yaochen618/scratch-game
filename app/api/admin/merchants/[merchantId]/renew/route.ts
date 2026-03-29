import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    merchantId: string;
  }>;
};

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { merchantId } = await context.params;

    const { data: merchant, error: findError } = await supabase
      .from("merchant_accounts")
      .select("id, expires_at")
      .eq("id", merchantId)
      .single();

    if (findError || !merchant) {
      return NextResponse.json({ error: "找不到商家" }, { status: 404 });
    }

    const now = new Date();
    const currentExpire = merchant.expires_at ? new Date(merchant.expires_at) : now;
    const baseDate = currentExpire > now ? currentExpire : now;

    const nextExpire = new Date(baseDate);
    nextExpire.setDate(nextExpire.getDate() + 30);

    const updatePayload: {
      billing_status: string;
      expires_at: string;
      plan_started_at?: string;
    } = {
      billing_status: "active",
      expires_at: nextExpire.toISOString(),
    };

    if (!merchant.expires_at) {
      updatePayload.plan_started_at = now.toISOString();
    }

    const { error: merchantUpdateError } = await supabase
      .from("merchant_accounts")
      .update(updatePayload)
      .eq("id", merchantId);

    if (merchantUpdateError) {
      return NextResponse.json(
        { error: merchantUpdateError.message },
        { status: 500 }
      );
    }

    const { error: storeUpdateError } = await supabase
      .from("stores")
      .update({
        billing_status: "active",
        expires_at: nextExpire.toISOString(),
        is_active: true,
      })
      .eq("merchant_id", merchantId);

    if (storeUpdateError) {
      return NextResponse.json(
        { error: storeUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expires_at: nextExpire.toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}