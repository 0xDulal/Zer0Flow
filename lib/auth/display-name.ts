import type { User } from "@supabase/supabase-js";

function prettifyLocalPart(email: string): string | null {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart.split(/[._-]+/).filter(Boolean);

  if (words.length >= 2) {
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return localPart.length > 0 ? localPart : null;
}

/**
 * Best-effort display name for the authenticated user. Prefers the name
 * collected by the identity provider (e.g. Google's full_name / name), then
 * derives a friendly name from the email local part.
 */
export function getDisplayName(user: User, fallback = "there"): string {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};

  for (const candidate of [metadata.full_name, metadata.name]) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const derived = prettifyLocalPart(user.email ?? "");

  return derived ?? fallback;
}

/**
 * Avatar URL supplied by the identity provider (e.g. Google), when present.
 */
export function getAvatarUrl(user: User): string | null {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};

  for (const candidate of [metadata.avatar_url, metadata.picture]) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * Up to two uppercase initials derived from a display name, for a small avatar.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
