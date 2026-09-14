# Auth setup

Zer0Flow uses Supabase Auth. Email/password works out of the box once the
Supabase env vars are set. Google OAuth requires the configuration below.

No OAuth secrets live in this repository or the Next.js frontend. The Google
Client ID/Secret are entered into the **Supabase dashboard** only.

---

## Google OAuth setup

### A. Google Cloud Console

1. Create or select a Google Cloud project.
2. Configure the **OAuth consent screen** (User type: External; add your app
   name, support email, and developer contact).
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
4. Application type: **Web application**.

### B. Authorized JavaScript origins

Add the origin(s) that initiate the sign-in:

- Local: `http://localhost:3000`
- Production: your real Zer0Flow origin, e.g. `https://app.zer0flow.com`

### C. Authorized redirect URI

This is **not** the Next.js callback. It must be the Supabase Auth callback
for your project (copy the exact value shown in the Supabase dashboard under
**Authentication → Providers → Google**):

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

Supabase receives Google's redirect, then forwards the user back to our app at
`/auth/callback`.

### D. Supabase — enable the provider

**Authentication → Providers → Google → Enable**, then paste:

- Google Client ID
- Google Client Secret

### E. Supabase — URL configuration

**Authentication → URL Configuration**, add our app's callback to the allowed
redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://<your-production-origin>/auth/callback`

Set the **Site URL** to the production origin. Do not hardcode origins in
application code — the OAuth redirect target is derived from the request origin.

---

## How it flows

1. The user clicks **Continue with Google** on `/login` or `/signup`.
2. The `signInWithGoogle` server action calls
   `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "<origin>/auth/callback" } })`
   and redirects the browser to the returned provider URL (PKCE; handled by
   `@supabase/ssr`).
3. Google authenticates the user and redirects to Supabase's callback.
4. Supabase redirects back to `/<origin>/auth/callback?code=...`.
5. `app/auth/callback/route.ts` exchanges the code for a session, runs the
   existing `ensureWorkspace()` logic, and redirects to `/dashboard`.
6. Any failure (provider disabled, config error, cancelled consent, failed
   exchange) redirects to `/auth/auth-code-error`. Raw provider/internal
   errors are logged server-side only and never shown to the user.
