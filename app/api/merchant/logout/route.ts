import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("merchant_id", "", {
    path: "/",
    maxAge: 0,
  });

  res.cookies.set("merchant_session", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}