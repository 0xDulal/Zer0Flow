"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

import { getRequestOrigin } from "./origin";

export type AuthFormState = {
  error?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Enter your email address." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!password) {
    return { error: "Enter your password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password || !confirmPassword) {
    return { error: "Fill in every field." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // CASE 2 — email confirmation is disabled: Supabase returns an authenticated
  // session, so bootstrap the workspace and go straight to the dashboard.
  if (data.session) {
    const { error: workspaceError } = await ensureWorkspace(supabase, email);

    if (workspaceError) {
      return {
        error: `Account created, but workspace setup failed: ${workspaceError}`,
      };
    }

    redirect("/dashboard");
  }

  // CASE 1 — email confirmation is required: no session is returned. Send the
  // user to the login page with a non-sensitive flag that drives a success
  // banner. No account details are put in the URL.
  redirect("/login?registered=1");
}

/**
 * Initiates Google OAuth (PKCE) using the Supabase SSR server client. The
 * redirect target is derived from the request origin and is always the fixed
 * `/auth/callback` path — no user-supplied URL is accepted. On any failure we
 * redirect to the clean auth error page instead of leaking internal detail.
 */
export async function signInWithGoogle(): Promise<void> {
  const origin = await getRequestOrigin();

  if (!origin) {
    console.error("Google OAuth: could not determine the request origin.");
    redirect("/auth/auth-code-error");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    // Log the provider/internal detail server-side only; never surface it.
    console.error("Google OAuth initiation failed:", error?.message);
    redirect("/auth/auth-code-error");
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
