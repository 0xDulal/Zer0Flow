import { headers } from "next/headers";

type HeaderReader = {
  get(name: string): string | null;
};

/**
 * Builds the request origin from host headers. Prefers proxy headers so the
 * result is correct behind Coolify/Traefik, and falls back to the local host
 * convention in development. Only ever returns an origin we constructed
 * ourselves from trusted request headers — never a user-supplied URL.
 */
export function originFromHeaders(headerReader: HeaderReader): string | null {
  const host = headerReader.get("x-forwarded-host") ?? headerReader.get("host");

  if (!host) {
    return null;
  }

  const forwardedProto = headerReader
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = forwardedProto || (isLocal ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function getRequestOrigin(): Promise<string | null> {
  return originFromHeaders(await headers());
}
