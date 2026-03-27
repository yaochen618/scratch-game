import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputCode = String(body.code || "").trim();
    const realCode = process.env.SITE_ACCESS_CODE;

    if (!realCode) {
      return NextResponse.json(
        { error: "伺服器未設定 SITE_ACCESS_CODE" },
        { status: 500 }
      );
    }

    if (!inputCode) {
      return NextResponse.json(
        { error: "請輸入驗證碼" },
        { status: 400 }
      );
    }

    if (inputCode !== realCode) {
      return NextResponse.json(
        { error: "驗證碼錯誤" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "驗證成功",
    });

    response.cookies.set("scratch_access", "ok", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error("verify-code error:", error);
    return NextResponse.json(
      { error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}