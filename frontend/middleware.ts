import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard/:path*", "/workflow/:path*"];

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get("autochain-auth-token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workflow/:path*"],
};
