"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export type AuthFormState = {
  error?: string;
  message?: string;
};

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

  if (!email || !password) {
    return { error: "Enter your email and password." };
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

  // When email confirmation is disabled Supabase returns a session and the
  // user is signed in immediately, so we can bootstrap their workspace now.
  if (data.session) {
    const { error: workspaceError } = await ensureWorkspace(supabase, email);

    if (workspaceError) {
      return { error: `Account created, but workspace setup failed: ${workspaceError}` };
    }

    redirect("/dashboard");
  }

  return {
    message:
      "Account created. Check your email to confirm your address, then sign in.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
