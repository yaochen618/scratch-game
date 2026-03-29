import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const body = await req.json();
  const draw_mode = body.draw_mode;

  if (!["uniform", "special"].includes(draw_mode)) {
    return NextResponse.json({ error: "無效模式" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({ draw_mode })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, room: data });
}