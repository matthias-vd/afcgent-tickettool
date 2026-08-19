import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const authed = await isValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname.startsWith("/admin") && !isLogin && !authed) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isLogin && authed) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
