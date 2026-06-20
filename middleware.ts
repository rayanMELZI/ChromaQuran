import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/* Public paths that never require a session:
 *  - /login, /about            : reachable while signed out
 *  - /render                   : the render worker (Playwright) loads this with no cookie
 *  - /api/auth/*               : login / logout
 * Static assets + /data are excluded via the matcher below. */
const PUBLIC_PAGES = ["/login", "/about", "/render"];
const PUBLIC_API = ["/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|icon.svg|data/|.*\\.(?:png|jpe?g|gif|svg|webp|ico|mp3|mp4|woff2?)$).*)",
  ],
};
