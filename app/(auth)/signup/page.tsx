import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account · Zer0Flow",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start turning prospects into clients with Zer0Flow
        </p>
      </div>

      <Card>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
