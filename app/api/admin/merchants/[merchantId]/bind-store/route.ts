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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { merchantId } = await context.params;
    const body = await req.json();
    const storeIds = Array.isArray(body.storeIds) ? body.storeIds : [];

    const { error: clearError } = await supabase
      .from("stores")
      .update({ merchant_id: null })
      .eq("merchant_id", merchantId);

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error: bindError } = await supabase
      .from("stores")
      .update({ merchant_id: merchantId })
      .in("id", storeIds);

    if (bindError) {
      return NextResponse.json({ error: bindError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}