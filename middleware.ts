import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/mcp(.*)", // MCP endpoints use API key auth
  "/api/public(.*)", // Public API endpoints (forms, etc.)
  "/select-org(.*)", // Organization selection page
  "/f(.*)", // Public form pages
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, orgId } = await auth();

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // If user is logged in but has no active organization, redirect to org selection
  if (userId && !orgId && !isPublicRoute(request)) {
    const selectOrgUrl = new URL("/select-org", request.url);
    selectOrgUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(selectOrgUrl);
  }

  // Get response
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=()"
  );

  // Allow microphone for voice input
  if (request.nextUrl.pathname.includes("/assistant")) {
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(self), geolocation=()"
    );
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
