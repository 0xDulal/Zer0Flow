import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Zer0Flow",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Zer0Flow account
        </p>
      </div>

      <Card>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
