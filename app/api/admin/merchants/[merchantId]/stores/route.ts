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

    const { error: deleteError } = await supabase
      .from("merchant_store_bindings")
      .delete()
      .eq("merchant_id", merchantId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const rows = storeIds.map((storeId: string) => ({
      merchant_id: merchantId,
      store_id: storeId,
    }));

    const { error: insertError } = await supabase
      .from("merchant_store_bindings")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}