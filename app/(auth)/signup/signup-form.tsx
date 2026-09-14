"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthFormState } from "@/lib/auth/actions";

import { AuthMessage } from "../_components/auth-message";
import { PasswordInput } from "../_components/password-input";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <AuthMessage variant="error">{state.error}</AuthMessage>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          aria-invalid={passwordsMismatch ? true : undefined}
          required
        />
        {passwordsMismatch ? (
          <p role="alert" className="text-xs text-destructive">
            Passwords do not match.
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || passwordsMismatch}
      >
        {isPending ? (
          <>
            <LoaderCircle className="animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
