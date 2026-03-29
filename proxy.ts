import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 商家頁保護
  const merchantId = request.cookies.get("merchant_id")?.value;
  const isMerchantPage = pathname.startsWith("/merchant");
  const isMerchantLoginPage = pathname.startsWith("/merchant/login");

  if (isMerchantPage && !isMerchantLoginPage && !merchantId) {
    return NextResponse.redirect(new URL("/merchant/login", request.url));
  }

  let response = NextResponse.next({
    request,
  });

  // 只有 admin 才處理 supabase auth
  if (pathname.startsWith("/admin")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: ["/merchant/:path*", "/admin/:path*"],
};