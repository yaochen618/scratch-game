import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { roomId } = await context.params;

  const cookieStore = await cookies();

  const staffId = cookieStore.get("staff_session")?.value;

  if (!staffId) {
    return NextResponse.json(
      { error: "未登入特殊身分" },
      { status: 401 }
    );
  }

  const { data: staff } = await supabase
    .from("store_staff")
    .select(
      "id, store_id, can_manage_special_mode, is_active"
    )
    .eq("id", staffId)
    .eq("is_active", true)
    .single();

  if (!staff) {
    return NextResponse.json(
      { error: "找不到特殊身分" },
      { status: 403 }
    );
  }

  if (!staff.can_manage_special_mode) {
    return NextResponse.json(
      { error: "沒有特殊模式管理權限" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const draw_mode = body.draw_mode;

  if (!["uniform", "special", "normal"].includes(draw_mode)) {
    return NextResponse.json(
      { error: "無效模式" },
      { status: 400 }
    );
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, store_id")
    .eq("id", roomId)
    .single();

  if (!room) {
    return NextResponse.json(
      { error: "找不到房間" },
      { status: 404 }
    );
  }

  if (String(room.store_id) !== String(staff.store_id)) {
    return NextResponse.json(
      { error: "不能修改其他店家的房間" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({
      draw_mode,
    })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    room: data,
  });
}