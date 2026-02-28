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
    return new NextResponse("Access denied. Please visit the application through Cloudflare Access.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
