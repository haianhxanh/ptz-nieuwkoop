import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/images") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  if (process.env.CF_AUTH_ENABLED !== "true") {
    return NextResponse.next();
  }

  const cfToken = request.cookies.get("CF_Authorization");

  if (!cfToken) {
    const teamDomain = process.env.NEXT_PUBLIC_CF_TEAM_DOMAIN;
    if (!teamDomain) {
      return new NextResponse("Auth misconfiguration: CF_TEAM_DOMAIN not set", { status: 500 });
    }
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.hostname;
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const loginUrl = new URL(`/cdn-cgi/access/login/${host}`, `https://${teamDomain}`);
    loginUrl.searchParams.set("redirect_url", `${protocol}://${host}${request.nextUrl.pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
