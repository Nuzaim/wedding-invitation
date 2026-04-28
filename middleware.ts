import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"'
    }
  });
}

export function middleware(request: NextRequest) {
  const user = process.env.ADMIN_BASIC_AUTH_USER?.trim();
  const pass = process.env.ADMIN_BASIC_AUTH_PASS?.trim();

  if (!user || !pass) {
    return unauthorizedResponse();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length).trim();
  let credentials = "";

  try {
    credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  } catch {
    return unauthorizedResponse();
  }

  const separatorIndex = credentials.indexOf(":");

  if (separatorIndex === -1) {
    return unauthorizedResponse();
  }

  const providedUser = credentials.slice(0, separatorIndex);
  const providedPass = credentials.slice(separatorIndex + 1);

  if (providedUser !== user || providedPass !== pass) {
    return unauthorizedResponse();
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
