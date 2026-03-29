import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params:
    | Promise<{
        storeId: string;
      }>
    | {
        storeId: string;
      };
};

async function getStoreId(context: RouteContext) {
  const resolvedParams = await Promise.resolve(context.params);
  return resolvedParams?.storeId;
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const storeId = await getStoreId(context);

    if (!storeId) {
      return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
    }

    const numericStoreId = Number(storeId);

    if (Number.isNaN(numericStoreId)) {
      return NextResponse.json({ error: "storeId 格式錯誤" }, { status: 400 });
    }

    // 1. 找出這個商店底下所有房間
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id")
      .eq("store_id", numericStoreId);

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    const roomIds = rooms?.map((room) => room.id) ?? [];

    // 2. 先刪房間底下的格子 / 刮刮樂資料
    if (roomIds.length > 0) {
      const { error: cellsError } = await supabase
        .from("cells")
        .delete()
        .in("room_id", roomIds);

      if (cellsError) {
        return NextResponse.json({ error: cellsError.message }, { status: 500 });
      }

      // 3. 再刪 rooms
      const { error: deleteRoomsError } = await supabase
        .from("rooms")
        .delete()
        .in("id", roomIds);

      if (deleteRoomsError) {
        return NextResponse.json(
          { error: deleteRoomsError.message },
          { status: 500 }
        );
      }
    }

    // 4. 如果 stores 跟 merchant 有綁定，可先把 merchant_id 清掉
    const { error: clearMerchantError } = await supabase
      .from("stores")
      .update({ merchant_id: null })
      .eq("id", numericStoreId);

    if (clearMerchantError) {
      return NextResponse.json(
        { error: clearMerchantError.message },
        { status: 500 }
      );
    }

    // 5. 最後刪 store
    const { error: deleteStoreError } = await supabase
      .from("stores")
      .delete()
      .eq("id", numericStoreId);

    if (deleteStoreError) {
      return NextResponse.json(
        { error: deleteStoreError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "刪除商店失敗" }, { status: 500 });
  }
}