import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const { data: admin } = await supabase
    .from("admin_accounts")
    .select("*")
    .eq("username", username)
    .single();

  if (!admin) {
    return NextResponse.json({ error: "帳號不存在" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);

  if (!valid) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 400 });
  }

  const cookieStore = await cookies();

  cookieStore.set("admin_session", admin.id, {
    httpOnly: true,
    path: "/",
  });

  return NextResponse.json({ success: true });
}