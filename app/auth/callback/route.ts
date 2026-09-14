import { NextResponse, type NextRequest } from "next/server";

import { originFromHeaders } from "@/lib/auth/origin";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Never trust a user-supplied redirect target — always resolve against the
  // request origin and a fixed, known path.
  const origin = originFromHeaders(request.headers) ?? request.nextUrl.origin;
  const errorUrl = new URL("/auth/auth-code-error", origin);

  if (oauthError) {
    console.error(
      "OAuth callback returned an error:",
      oauthError,
      searchParams.get("error_description") ?? "",
    );
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    console.error("OAuth callback is missing the authorization code.");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth code exchange failed:", error.message);
    return NextResponse.redirect(errorUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("OAuth callback: no user found after code exchange.");
    return NextResponse.redirect(errorUrl);
  }

  const { error: workspaceError } = await ensureWorkspace(
    supabase,
    user.email ?? undefined,
  );

  if (workspaceError) {
    // Non-fatal: the dashboard re-runs ensureWorkspace. Log for debugging.
    console.error("Workspace bootstrap failed after OAuth:", workspaceError);
  }

  return NextResponse.redirect(new URL("/dashboard", origin));
}
