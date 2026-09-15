import dns from "node:dns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UrlGuardOk = { ok: true; url: string };
export type UrlGuardError = {
  ok: false;
  code: UrlGuardErrorCode;
  message: string;
};
export type UrlGuardResult = UrlGuardOk | UrlGuardError;

export type UrlGuardErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "CREDENTIALS_NOT_ALLOWED"
  | "PORT_NOT_ALLOWED"
  | "HOSTNAME_BLOCKED"
  | "DNS_RESOLVE_FAILED"
  | "IP_ADDRESS_BLOCKED";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set([null, 80, 443]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
  "metadata.google.internal",
  "instance-data",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".local",
  ".localdomain",
  ".internal",
  ".localhost",
  ".test",
  ".example",
  ".invalid",
];

const IPv4_PRIVATE_PREFIXES: Array<{
  test: (addr: string) => boolean;
}> = [
  // 0.0.0.0/8
  { test: (a) => a.startsWith("0.") },
  // 10.0.0.0/8
  { test: (a) => a.startsWith("10.") },
  // 100.64.0.0/10  (100.64.x.x – 100.127.x.x)
  { test: (a) => {
    const second = parseInt(a.split(".")[1] ?? "", 10);
    return a.startsWith("100.") && second >= 64 && second <= 127;
  }},
  // 127.0.0.0/8
  { test: (a) => a.startsWith("127.") },
  // 169.254.0.0/16
  { test: (a) => a.startsWith("169.254.") },
  // 172.16.0.0/12  (172.16.x.x – 172.31.x.x)
  { test: (a) => {
    const second = parseInt(a.split(".")[1] ?? "", 10);
    return a.startsWith("172.") && second >= 16 && second <= 31;
  }},
  // 192.168.0.0/16
  { test: (a) => a.startsWith("192.168.") },
  // 198.18.0.0/15  (benchmarking)
  { test: (a) => {
    const second = parseInt(a.split(".")[1] ?? "", 10);
    return a.startsWith("198.") && (second === 18 || second === 19);
  }},
  // 224.0.0.0/4  (multicast)
  { test: (a) => {
    const first = parseInt(a.split(".")[0] ?? "", 10);
    return first >= 224 && first <= 239;
  }},
  // 240.0.0.0/4  (reserved, excluding 255.255.255.255 broadcast)
  { test: (a) => {
    const first = parseInt(a.split(".")[0] ?? "", 10);
    return first >= 240 && first <= 254;
  }},
];

const IPv6_PRIVATE_PREFIXES: Array<{
  test: (addr: string) => boolean;
}> = [
  // ::1  (loopback)
  { test: (a) => a === "::1" },
  // ::  (unspecified)
  { test: (a) => a === "::" },
  // ::ffff:0:0/96  (IPv4-mapped IPv6)
  { test: (a) => a.startsWith("::ffff:") },
  // fc00::/7  (unique local)
  { test: (a) => {
    const h = expandIPv6(a);
    if (!h) return false;
    const first = parseInt(h.slice(0, 2), 16);
    return (first & 0xfe) === 0xfc;
  }},
  // fe80::/10  (link-local)
  { test: (a) => {
    const h = expandIPv6(a);
    if (!h) return false;
    return h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb");
  }},
  // Multicast  ff00::/8
  { test: (a) => {
    const h = expandIPv6(a);
    if (!h) return false;
    return h.startsWith("ff");
  }},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(code: UrlGuardErrorCode, message: string): UrlGuardError {
  return { ok: false, code, message };
}

function normalizePort(port: string | null): number | null {
  if (port === null || port === "") return null;
  const n = Number(port);
  return Number.isFinite(n) ? n : null;
}

/**
 * Expand an IPv6 address to its full 32-hex-digit form for reliable prefix
 * matching.  Returns null if the input doesn't look like IPv6.
 */
function expandIPv6(addr: string): string | null {
  // Already bracket-stripped by URL constructor
  if (!addr.includes(":")) return null;

  // Handle :: expansion
  const halves = addr.split("::");
  if (halves.length > 2) return null;

  let left: string[];
  let right: string[];

  if (halves.length === 2) {
    left = halves[0] ? halves[0].split(":") : [];
    right = halves[1] ? halves[1].split(":") : [];
    const fill = 8 - left.length - right.length;
    if (fill < 0) return null;
    const middle = Array<string>(fill).fill("0000");
    const parts = [...left, ...middle, ...right];
    return parts.map((p) => p.padStart(4, "0")).join("");
  }

  const parts = addr.split(":");
  if (parts.length !== 8) return null;
  return parts.map((p) => p.padStart(4, "0")).join("");
}

function isPrivateIPv4(addr: string): boolean {
  return IPv4_PRIVATE_PREFIXES.some((rule) => rule.test(addr));
}

function isPrivateIPv6(addr: string): boolean {
  return IPv6_PRIVATE_PREFIXES.some((rule) => rule.test(addr));
}

function isPrivateAddress(addr: string): boolean {
  const h = stripBrackets(addr);
  if (h.includes(":")) return isPrivateIPv6(h);
  return isPrivateIPv4(h);
}

function isBlockedHostname(hostname: string): boolean {
  const lower = stripBrackets(hostname).toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate and normalize a URL string.
 *
 * Performs synchronous checks only — protocol, credentials, port, hostname
 * blocklist.  Does NOT resolve DNS.
 */
export function validateUrl(raw: string): UrlGuardResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fail("INVALID_URL", "URL must be a non-empty string.");
  }

  let parsed: URL;

  try {
    parsed = new URL(raw.trim());
  } catch {
    return fail("INVALID_URL", "The provided string is not a valid URL.");
  }

  // Protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return fail(
      "UNSUPPORTED_PROTOCOL",
      `Protocol "${parsed.protocol}" is not allowed. Use http: or https:.`,
    );
  }

  // Credentials
  if (parsed.username !== "" || parsed.password !== "") {
    return fail(
      "CREDENTIALS_NOT_ALLOWED",
      "URLs with embedded credentials are not allowed.",
    );
  }

  // Port
  const port = normalizePort(parsed.port || null);
  if (!ALLOWED_PORTS.has(port)) {
    return fail(
      "PORT_NOT_ALLOWED",
      `Port ${port} is not allowed. Only ports 80 and 443 are accepted.`,
    );
  }

  // Hostname blocklist
  if (isBlockedHostname(parsed.hostname)) {
    return fail(
      "HOSTNAME_BLOCKED",
      "The target hostname is not allowed.",
    );
  }

  // Quick numeric IP check for obvious cases before DNS resolve
  const hostname = parsed.hostname;
  if (isIPAddress(hostname) && isPrivateAddress(hostname)) {
    return fail("IP_ADDRESS_BLOCKED", "The target IP address is not allowed.");
  }

  // Normalize the URL: strip default port, trailing hash, etc.
  const normalized = normalizeUrl(parsed);

  return { ok: true, url: normalized };
}

/**
 * Resolve the hostname of an already-validated URL and check that every
 * resolved address is publicly routable.
 *
 * Call this after `validateUrl` succeeds, before initiating a request.
 * Useful inside Playwright request interception and Trigger.dev jobs.
 */
export async function validateResolvedAddress(
  url: string,
): Promise<UrlGuardResult> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return fail("INVALID_URL", "The provided string is not a valid URL.");
  }

  const hostname = parsed.hostname;
  const bareHostname = stripBrackets(hostname);

  // If the hostname is already a public IP, skip DNS
  if (isIPAddress(bareHostname)) {
    if (isPrivateAddress(bareHostname)) {
      return fail(
        "IP_ADDRESS_BLOCKED",
        "The target IP address is not allowed.",
      );
    }
    return { ok: true, url };
  }

  // Resolve
  let addresses: dns.LookupAddress[];

  try {
    addresses = await dns.promises.lookup(bareHostname, {
      all: true,
      family: 0,
    });
  } catch {
    return fail(
      "DNS_RESOLVE_FAILED",
      `Could not resolve hostname "${bareHostname}".`,
    );
  }

  if (addresses.length === 0) {
    return fail(
      "DNS_RESOLVE_FAILED",
      `No addresses found for "${bareHostname}".`,
    );
  }

  for (const addr of addresses) {
    if (isPrivateAddress(addr.address)) {
      return fail(
        "IP_ADDRESS_BLOCKED",
        `Hostname "${bareHostname}" resolved to a private/reserved address.`,
      );
    }
  }

  return { ok: true, url };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function stripBrackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function isIPAddress(hostname: string): boolean {
  const h = stripBrackets(hostname);
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  // IPv6
  if (h.includes(":")) return true;
  return false;
}

function normalizeUrl(url: URL): string {
  const out = new URL(url.href);

  // Strip default ports
  if (
    (out.protocol === "http:" && out.port === "80") ||
    (out.protocol === "https:" && out.port === "443")
  ) {
    out.port = "";
  }

  // Remove trailing hash
  if (out.hash === "#") {
    out.hash = "";
  }

  // Ensure trailing slash on bare origins
  if (out.pathname === "" && out.search === "") {
    out.pathname = "/";
  }

  return out.href;
}
