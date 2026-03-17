import { NextRequest, NextResponse } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  user: ["/user"],
  technician: ["/technician"],
  manager: ["/manager"],
};

const PUBLIC_ROUTES = ["/", "/login", "/verify", "/api/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith("/api/"))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.endsWith(".json") || pathname.endsWith(".ico") || pathname.endsWith(".png") || pathname.endsWith(".svg")) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get("fixit_session")?.value;

  if (!sessionId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify session server-side via Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/sessions?id=eq.${sessionId}&expires_at=gt.${new Date().toISOString()}&select=role`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const sessions = await res.json();

    if (!Array.isArray(sessions) || sessions.length === 0) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("fixit_session");
      return response;
    }

    const role = sessions[0].role;

    // Check if user has access to this route
    const allowedPrefixes = ROLE_ROUTES[role];
    if (allowedPrefixes && !allowedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      // Redirect to their own portal
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
