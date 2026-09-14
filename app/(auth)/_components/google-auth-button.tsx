"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";

import { GoogleIcon } from "./google-icon";

function GoogleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
      aria-label="Continue with Google"
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          Connecting to Google…
        </>
      ) : (
        <>
          <GoogleIcon className="size-4" />
          Continue with Google
        </>
      )}
    </Button>
  );
}

export function GoogleAuthButton() {
  return (
    <form action={signInWithGoogle}>
      <GoogleSubmitButton />
    </form>
  );
}
