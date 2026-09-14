import type { Metadata } from "next";
import Link from "next/link";

import { AuthDivider } from "../_components/auth-divider";
import { GoogleAuthButton } from "../_components/google-auth-button";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account · Zer0Flow",
};

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your Zer0Flow account
        </h1>
        <p className="text-sm text-muted-foreground">
          Turn prospects into clients with a system built for follow-through.
        </p>
      </div>

      <div className="space-y-5">
        <GoogleAuthButton />
        <AuthDivider />
        <SignupForm />
      </div>

      <p className="text-sm text-muted-foreground">
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
