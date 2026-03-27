import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const merchantSession = request.cookies.get("merchant_session");

  const isMerchantPage = request.nextUrl.pathname.startsWith("/merchant");
  const isLoginPage = request.nextUrl.pathname.startsWith("/merchant/login");

  // 不是 merchant 頁面 → 放行
  if (!isMerchantPage) return NextResponse.next();

  // 登入頁 → 放行
  if (isLoginPage) return NextResponse.next();

  // 沒登入 → 強制導到 login
  if (!merchantSession) {
    return NextResponse.redirect(new URL("/merchant/login", request.url));
  }

  return NextResponse.next();
}