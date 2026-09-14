import type { Metadata } from "next";
import Link from "next/link";

import { AuthMessage } from "../_components/auth-message";
import { AuthDivider } from "../_components/auth-divider";
import { GoogleAuthButton } from "../_components/google-auth-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Zer0Flow",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const registered = params.registered === "1";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
      </div>

      {registered ? (
        <AuthMessage variant="success" title="Account created successfully">
          Check your email to confirm your account, then sign in.
        </AuthMessage>
      ) : null}

      <div className="space-y-5">
        <GoogleAuthButton />
        <AuthDivider />
        <LoginForm />
      </div>

      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
