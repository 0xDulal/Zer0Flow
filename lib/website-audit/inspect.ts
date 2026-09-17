import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

import {
  validateResolvedAddress,
  validateUrl,
} from "@/lib/website-audit/url-guard";
import type { UrlGuardError } from "@/lib/website-audit/url-guard";

// SERVER ONLY — this module uses Node APIs (node:dns via the URL guard) and
// Playwright. Never import it from Client Components.

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WebsiteInspectionErrorCode =
  | "INVALID_URL"
  | "DNS_RESOLVE_FAILED"
  | "NAVIGATION_FAILED"
  | "REDIRECT_LIMIT"
  | "TIMEOUT"
  | "BROWSER_ERROR"
  | "INSPECTION_FAILED";

export type WebsiteInspectionError = {
  code: WebsiteInspectionErrorCode;
  message: string;
  /**
   * When true the failure is caused by the browser/tooling environment rather
   * than by the website itself, so a Trigger.dev run should treat it as an
   * infrastructure failure and retry instead of persisting a terminal FAILED.
   */
  retryable: boolean;
};

/**
 * Codes that describe tooling/infrastructure failures. Every other code is a
 * deterministic, website-specific failure that must NOT be retried:
 *   INVALID_URL / DNS_RESOLVE_FAILED / NAVIGATION_FAILED / REDIRECT_LIMIT /
 *   TIMEOUT
 * are classification A (terminal FAILED); BROWSER_ERROR / INSPECTION_FAILED
 * are classification B (throw so Trigger.dev retries).
 */
const RETRYABLE_ERROR_CODES = new Set<WebsiteInspectionErrorCode>([
  "BROWSER_ERROR",
  "INSPECTION_FAILED",
]);

export type WebsiteFacts = {
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  headingTexts: string[];
  linkCount: number;
  navLinkCount: number;
  externalLinkCount: number;
  emailLinkCount: number;
  phoneLinkCount: number;
  ctaCount: number;
  ctaTexts: string[];
  formCount: number;
  inputCount: number;
  imageCount: number;
  imagesMissingAltCount: number;
  hasViewportMeta: boolean;
  hasFavicon: boolean;
  hasContactPage: boolean;
  hasAboutPage: boolean;
  hasPrivacyPolicy: boolean;
  hasTerms: boolean;
  hasTestimonials: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  pageTextCharacterCount: number;
  visibleText: string;
  socialLinks: Record<SocialPlatform, string[]>;
};

export type WebsiteInspectionResult = {
  finalUrl: string;
  facts: WebsiteFacts;
};

export type InspectWebsiteResult =
  | { ok: true; data: WebsiteInspectionResult }
  | { ok: false; error: WebsiteInspectionError };

// ---------------------------------------------------------------------------
// Public configuration
// ---------------------------------------------------------------------------

export const NAVIGATION_TIMEOUT_MS = 15_000;
export const OVERALL_TIMEOUT_MS = 30_000;
export const MAX_REDIRECTS = 5;

// ---------------------------------------------------------------------------
// Internal limits
// ---------------------------------------------------------------------------

const SETTLE_DELAY_MS = 1_500;

const CONTENT_LIMITS = {
  visibleText: 20_000,
  title: 500,
  description: 1_000,
  headings: 100,
  anchors: 200,
  ctaTexts: 50,
  anchorText: 100,
} as const;

export type SocialPlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "youtube"
  | "twitter"
  | "x";

// ---------------------------------------------------------------------------
// Safe user-facing messages
// ---------------------------------------------------------------------------

const MESSAGES: Record<WebsiteInspectionErrorCode, string> = {
  INVALID_URL: "The provided website URL is not allowed.",
  DNS_RESOLVE_FAILED: "The website host could not be resolved.",
  NAVIGATION_FAILED:
    "The website could not be opened or was blocked from a disallowed destination during navigation.",
  REDIRECT_LIMIT: "The website redirected too many times.",
  TIMEOUT: "The website took too long to respond.",
  BROWSER_ERROR: "The browser could not be started for the inspection.",
  INSPECTION_FAILED: "Website inspection failed.",
};

function error(
  code: WebsiteInspectionErrorCode,
  message?: string,
): { ok: false; error: WebsiteInspectionError } {
  return {
    ok: false,
    error: {
      code,
      message: message ?? MESSAGES[code],
      retryable: RETRYABLE_ERROR_CODES.has(code),
    },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Safely opens a website with headless Chromium, follows and validates its
 * redirects, and returns structured, observable facts about the page.
 *
 * The inspector only reports facts. It does not score or judge the website.
 *
 * SERVER ONLY.
 */
export async function inspectWebsite(
  rawUrl: string,
): Promise<InspectWebsiteResult> {
  const startedAt = Date.now();

  // 1. URL validation (synchronous).
  const urlCheck = validateUrl(rawUrl);
  if (!urlCheck.ok) {
    return error("INVALID_URL");
  }
  let target = urlCheck.url;

  // 2. DNS validation.
  const resolved = await validateResolvedAddress(target);
  if (!resolved.ok) {
    return error(mapGuardErrorCode(resolved));
  }
  target = resolved.url;

  // 3. Launch a fresh browser.
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
  } catch (err) {
    console.error("[website-audit] failed to launch browser:", err);
    return error("BROWSER_ERROR");
  }

  // 4. Navigate + extract under an overall deadline.
  try {
    const remaining = OVERALL_TIMEOUT_MS - (Date.now() - startedAt);

    if (remaining <= 0) {
      return error("TIMEOUT");
    }

    return await withTimeout(remaining, () =>
      runInspection(browser as Browser, target),
    );
  } catch (err) {
    if (err instanceof InspectionTimeoutError || isPlaywrightTimeout(err)) {
      return error("TIMEOUT");
    }
    if (err instanceof NavigationBlockedError) {
      return err.failure;
    }
    console.error("[website-audit] inspection failed:", err);
    return error("INSPECTION_FAILED");
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Navigation + extraction
// ---------------------------------------------------------------------------

type NavFailure = {
  code: "NAVIGATION_FAILED" | "REDIRECT_LIMIT";
  message: string;
  // Navigation and redirect rejections are deterministic website failures.
  retryable: false;
};

type CdpHeader = { name: string; value: string };

type CdpRequestPausedEvent = {
  requestId: string;
  request: { url: string };
  resourceType?: string;
  frameId?: string;
  responseStatusCode?: number;
  responseHeaders?: CdpHeader[];
};

class NavigationBlockedError extends Error {
  readonly failure: { ok: false; error: WebsiteInspectionError };

  constructor(failure: NavFailure) {
    super(failure.message);
    this.name = "NavigationBlockedError";
    this.failure = { ok: false, error: failure };
  }
}

async function runInspection(
  browser: Browser,
  target: string,
): Promise<InspectWebsiteResult> {
  const browserContext = await browser.newContext();
  const page = await browserContext.newPage();

  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

  let navFailure: NavFailure | null = null;
  let redirectCount = 0;
  let mainFrameId: string | null = null;
  const dnsCache = new Map<string, boolean>();

  const isHostAllowed = async (urlString: string): Promise<boolean> => {
    try {
      const hostname = new URL(urlString).hostname;
      const cached = dnsCache.get(hostname);
      if (cached !== undefined) return cached;

      const result = await validateResolvedAddress(urlString);
      dnsCache.set(hostname, result.ok);
      return result.ok;
    } catch {
      return false;
    }
  };

  const recordNavFailure = (code: NavFailure["code"]): void => {
    if (!navFailure) {
      navFailure = { code, message: MESSAGES[code], retryable: false };
    }
  };

  // Intercept every request at the CDP level. The Playwright `page.route`
  // API only sees the initial request of a redirect chain, so it cannot
  // protect against unsafe redirect targets. The CDP Fetch domain pauses
  // every request stage — including every redirect hop — which lets us
  // validate and abort unsafe destinations before they are followed.
  const client = await browserContext.newCDPSession(page);

  await client.send("Fetch.enable", {
    patterns: [
      { urlPattern: "*", requestStage: "Request" },
      { urlPattern: "*", requestStage: "Response" },
    ],
    handleAuthRequests: false,
  });

  const onRequestPaused = async (event: CdpRequestPausedEvent) => {
    try {
      const isResponseStage = event.responseStatusCode !== undefined;
      const isDocument =
        event.resourceType === "Document" && event.frameId !== undefined;

      if (isDocument && mainFrameId === null) {
        mainFrameId = event.frameId ?? null;
      }
      const isMainFrame =
        isDocument && mainFrameId !== null && event.frameId === mainFrameId;

      if (!isResponseStage) {
        // A request is about to be sent (or redirected to). Validate the URL
        // and resolve the host. Abort unsafe requests; never let navigation
        // or a subresource reach a private/blocked destination.
        const urlCheck = validateUrl(event.request.url);

        if (!urlCheck.ok || !(await isHostAllowed(urlCheck.url))) {
          if (isMainFrame) {
            recordNavFailure("NAVIGATION_FAILED");
          }
          await client
            .send("Fetch.failRequest", {
              requestId: event.requestId,
              errorReason: "BlockedByClient",
            })
            .catch(() => {});
          return;
        }

        await client
          .send("Fetch.continueRequest", { requestId: event.requestId })
          .catch(() => {});
        return;
      }

      // Response stage. A 3xx response is a redirect: validate where it
      // leads before allowing the browser to follow it.
      if (isRedirectStatus(event.responseStatusCode)) {
        const location = findHeader(event.responseHeaders, "location");
        const redirectCountIsExceeded = redirectCount >= MAX_REDIRECTS;

        if (location) redirectCount += 1;

        if (isMainFrame && redirectCountIsExceeded) {
          recordNavFailure("REDIRECT_LIMIT");
          await client
            .send("Fetch.failRequest", {
              requestId: event.requestId,
              errorReason: "BlockedByClient",
            })
            .catch(() => {});
          return;
        }

        if (location) {
          const locationOk = isRedirectTargetAllowed(
            location,
            event.request.url,
            isHostAllowed,
          );
          if (!(await locationOk)) {
            if (isMainFrame) {
              recordNavFailure("NAVIGATION_FAILED");
            }
            await client
              .send("Fetch.failRequest", {
                requestId: event.requestId,
                errorReason: "BlockedByClient",
              })
              .catch(() => {});
            return;
          }
        }
      }

      await client
        .send("Fetch.continueResponse", { requestId: event.requestId })
        .catch(() => {});
    } catch {
      // Never let an interception bookkeeping error hang a request. If the
      // page is gone, the request is gone with it.
      await client
        .send("Fetch.failRequest", {
          requestId: event.requestId,
          errorReason: "Failed",
        })
        .catch(() => {});
    }
  };

  client.on("Fetch.requestPaused", onRequestPaused);

  // 1. Navigate.
  try {
    await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
  } catch (err) {
    if (navFailure) throw new NavigationBlockedError(navFailure);
    throw err;
  }

  // Give client-side scripts a bounded moment to render.
  await page.waitForTimeout(SETTLE_DELAY_MS);

  // 2. The final URL must also pass the guard. Redirect targets were already
  //    validated per hop; this re-checks the settled document location.
  const finalUrl = page.url();

  if (finalUrl === "about:blank" || finalUrl === "") {
    return error("NAVIGATION_FAILED");
  }

  const finalCheck = validateUrl(finalUrl);
  if (!finalCheck.ok) {
    return error("NAVIGATION_FAILED");
  }

  if (!(await isHostAllowed(finalCheck.url))) {
    return error("NAVIGATION_FAILED");
  }

  // 3. Extract facts.
  const snapshot = await readPageSnapshot(page);
  const facts = buildFacts(snapshot);

  return {
    ok: true,
    data: {
      finalUrl: finalCheck.url,
      facts,
    },
  };
}

// ---------------------------------------------------------------------------
// Facts extraction
// ---------------------------------------------------------------------------

type PageSnapshot = {
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  headingTexts: string[];
  linkCount: number;
  navLinkCount: number;
  externalLinkCount: number;
  emailLinkCount: number;
  phoneLinkCount: number;
  anchors: { href: string | null; text: string }[];
  buttonTexts: string[];
  formCount: number;
  inputCount: number;
  imageCount: number;
  imagesMissingAltCount: number;
  hasViewportMeta: boolean;
  hasFavicon: boolean;
  textLength: number;
  text: string;
};

const SNAPSHOT_SCRIPT = `(() => {
  const limits = {
    visibleText: ${CONTENT_LIMITS.visibleText},
    title: ${CONTENT_LIMITS.title},
    description: ${CONTENT_LIMITS.description},
    headings: ${CONTENT_LIMITS.headings},
    anchors: ${CONTENT_LIMITS.anchors},
    anchorText: ${CONTENT_LIMITS.anchorText},
  };

  try {
    let title = document.title.trim();
    if (title.length > limits.title) title = title.slice(0, limits.title);

    const descriptionEl = document.querySelector('meta[name="description"]');
    let description =
      descriptionEl && descriptionEl.content ? descriptionEl.content.trim() : null;
    if (description && description.length > limits.description) {
      description = description.slice(0, limits.description);
    }

    const h1s = document.querySelectorAll("h1");
    const h2s = document.querySelectorAll("h2");
    const headings = Array.prototype.slice
      .call(document.querySelectorAll("h1, h2"), 0, limits.headings)
      .map((h) => (h.textContent || "").trim())
      .filter((t) => t.length > 0);

    const anchors = Array.prototype.slice.call(document.querySelectorAll("a"));

    const body = document.body;
    const bodyText = body && body.innerText ? body.innerText : "";
    const text = bodyText.slice(0, limits.visibleText);
    const textLength = bodyText.length;

    const emailLinkCount = anchors.filter(
      (a) => (a.getAttribute("href") || "").startsWith("mailto:"),
    ).length;
    const phoneLinkCount = anchors.filter(
      (a) => (a.getAttribute("href") || "").startsWith("tel:"),
    ).length;

    const isInNav = (a) =>
      a.closest("nav, header, [role='navigation']") !== null;

    const navLinkCount = anchors.filter(isInNav).length;
    const externalLinkCount = anchors.filter((a) => {
      try {
        return (
          new URL(a.href).hostname !== "" &&
          new URL(a.href).hostname !== window.location.hostname
        );
      } catch (e) {
        return false;
      }
    }).length;

    const anchorRows = anchors.slice(0, limits.anchors).map((a) => ({
      href: a.getAttribute("href"),
      text: (a.textContent || "").trim().slice(0, limits.anchorText),
    }));

    const buttons = Array.prototype.slice.call(
      document.querySelectorAll("button, [role='button']"),
    );
    const buttonTexts = buttons
      .map((b) => (b.textContent || "").trim().slice(0, limits.anchorText))
      .filter((t) => t.length > 0);

    const images = Array.prototype.slice.call(document.querySelectorAll("img"));
    const imageCount = images.length;
    const imagesMissingAltCount = images.filter(
      (img) =>
        !img.hasAttribute("alt") ||
        (img.getAttribute("alt") || "").trim() === "",
    ).length;

    const viewport = document.querySelector('meta[name="viewport"]');
    const favicon = document.querySelector('link[rel~="icon"]');

    return {
      title: title.length > 0 ? title : null,
      description: description,
      h1Count: h1s.length,
      h2Count: h2s.length,
      headingTexts: headings,
      linkCount: anchors.length,
      navLinkCount: navLinkCount,
      externalLinkCount: externalLinkCount,
      emailLinkCount: emailLinkCount,
      phoneLinkCount: phoneLinkCount,
      anchors: anchorRows,
      buttonTexts: buttonTexts,
      formCount: document.querySelectorAll("form").length,
      inputCount: document.querySelectorAll("input, select, textarea").length,
      imageCount: imageCount,
      imagesMissingAltCount: imagesMissingAltCount,
      hasViewportMeta: viewport !== null,
      hasFavicon: favicon !== null,
      textLength: textLength,
      text: text,
    };
  } catch (e) {
    return {
      title: null,
      description: null,
      h1Count: 0,
      h2Count: 0,
      headingTexts: [],
      linkCount: 0,
      navLinkCount: 0,
      externalLinkCount: 0,
      emailLinkCount: 0,
      phoneLinkCount: 0,
      anchors: [],
      buttonTexts: [],
      formCount: 0,
      inputCount: 0,
      imageCount: 0,
      imagesMissingAltCount: 0,
      hasViewportMeta: false,
      hasFavicon: false,
      textLength: 0,
      text: "",
    };
  }
})()`;

async function readPageSnapshot(page: Page): Promise<PageSnapshot> {
  return page.evaluate(SNAPSHOT_SCRIPT);
}

// ---------------------------------------------------------------------------
// Fact detection heuristics
// ---------------------------------------------------------------------------

const CTA_TEXT_RE =
  /\b(book|booking|schedule|call|contact|get[- ]started|start now|start today|start|apply|join|buy|purchase|request a quote|request|quote|consultation|consult|demo|learn more|sign up|register|free trial|get in touch|work with us|talk to us)\b/i;

const CTA_PATH_SEGMENTS = [
  "book",
  "booking",
  "schedule",
  "call",
  "contact",
  "apply",
  "join",
  "quote",
  "demo",
  "signup",
  "register",
  "start",
  "get-started",
  "consult",
  "consultation",
  "request",
  "work-with",
];

const CONTACT_NEEDLES = ["contact", "get in touch"];
const ABOUT_NEEDLES = ["about"];
const PRIVACY_NEEDLES = ["privacy"];
const TERMS_NEEDLES = ["terms"];
const BOOKING_NEEDLES = [
  "booking",
  "book a",
  "book now",
  "book your",
  "schedule",
  "calendly",
  "appointment",
  "consultation",
];
const PRICING_NEEDLES = ["pricing", "price", "plans"];
const TESTIMONIAL_NEEDLES = [
  "testimonial",
  "reviews",
  "client results",
  "success stor",
  "what our client",
  "what client",
];

function buildFacts(snapshot: PageSnapshot): WebsiteFacts {
  const anchorHrefsAndTexts: string[] = [];
  for (const anchor of snapshot.anchors) {
    if (anchor.href) anchorHrefsAndTexts.push(anchor.href);
    if (anchor.text) anchorHrefsAndTexts.push(anchor.text);
  }

  const searchHints = [
    ...anchorHrefsAndTexts,
    ...snapshot.headingTexts,
    snapshot.text,
  ];

  const ctaTexts: string[] = [];
  let ctaCount = 0;

  for (const anchor of snapshot.anchors) {
    if (isCtaAnchor(anchor)) {
      ctaCount += 1;
      if (
        anchor.text.length > 0 &&
        ctaTexts.length < CONTENT_LIMITS.ctaTexts
      ) {
        ctaTexts.push(anchor.text);
      }
    }
  }

  for (const buttonText of snapshot.buttonTexts) {
    ctaCount += 1;
    if (ctaTexts.length < CONTENT_LIMITS.ctaTexts) {
      ctaTexts.push(buttonText);
    }
  }

  return {
    title: snapshot.title,
    description: snapshot.description,
    h1Count: snapshot.h1Count,
    h2Count: snapshot.h2Count,
    headingTexts: snapshot.headingTexts,
    linkCount: snapshot.linkCount,
    navLinkCount: snapshot.navLinkCount,
    externalLinkCount: snapshot.externalLinkCount,
    emailLinkCount: snapshot.emailLinkCount,
    phoneLinkCount: snapshot.phoneLinkCount,
    ctaCount,
    ctaTexts: [...new Set(ctaTexts)].slice(0, CONTENT_LIMITS.ctaTexts),
    formCount: snapshot.formCount,
    inputCount: snapshot.inputCount,
    imageCount: snapshot.imageCount,
    imagesMissingAltCount: snapshot.imagesMissingAltCount,
    hasViewportMeta: snapshot.hasViewportMeta,
    hasFavicon: snapshot.hasFavicon,
    hasContactPage: containsAny(CONTACT_NEEDLES, anchorHrefsAndTexts),
    hasAboutPage: containsAny(ABOUT_NEEDLES, anchorHrefsAndTexts),
    hasPrivacyPolicy: containsAny(PRIVACY_NEEDLES, anchorHrefsAndTexts),
    hasTerms: containsAny(TERMS_NEEDLES, anchorHrefsAndTexts),
    hasTestimonials: containsAny(TESTIMONIAL_NEEDLES, searchHints),
    hasPricing: containsAny(PRICING_NEEDLES, searchHints),
    hasBooking: containsAny(BOOKING_NEEDLES, searchHints),
    pageTextCharacterCount: snapshot.textLength,
    visibleText: snapshot.text,
    socialLinks: extractSocialLinks(snapshot.anchors),
  };
}

function isCtaAnchor(anchor: { href: string | null; text: string }): boolean {
  if (anchor.text.length > 0 && CTA_TEXT_RE.test(anchor.text)) return true;

  if (anchor.href) {
    try {
      const path = new URL(anchor.href).pathname.toLowerCase();
      const segments = path.split("/").filter((s) => s.length > 0);
      return segments.some((seg) =>
        CTA_PATH_SEGMENTS.some((cta) => seg.startsWith(cta) || seg.includes(cta)),
      );
    } catch {
      return false;
    }
  }

  return false;
}

function containsAny(
  needles: string[],
  haystacks: Iterable<string>,
): boolean {
  for (const haystack of haystacks) {
    if (haystack.length === 0) continue;
    const lower = haystack.toLowerCase();
    for (const needle of needles) {
      if (lower.includes(needle)) return true;
    }
  }
  return false;
}

function socialPlatform(hostname: string): SocialPlatform | null {
  const h = hostname.toLowerCase().replace(/^www\./, "");

  if (h === "linkedin.com" || h.endsWith(".linkedin.com")) return "linkedin";
  if (h === "facebook.com" || h.endsWith(".facebook.com")) return "facebook";
  if (h === "instagram.com" || h.endsWith(".instagram.com")) return "instagram";
  if (h === "youtube.com" || h.endsWith(".youtube.com")) return "youtube";
  if (h === "twitter.com" || h.endsWith(".twitter.com")) return "twitter";
  if (h === "x.com") return "x";
  return null;
}

function extractSocialLinks(
  anchors: { href: string | null; text: string }[],
): Record<SocialPlatform, string[]> {
  const found: Record<SocialPlatform, Set<string>> = {
    linkedin: new Set(),
    facebook: new Set(),
    instagram: new Set(),
    youtube: new Set(),
    twitter: new Set(),
    x: new Set(),
  };

  for (const anchor of anchors) {
    if (!anchor.href) continue;

    let hostname: string;
    try {
      hostname = new URL(anchor.href).hostname;
    } catch {
      continue;
    }

    const platform = socialPlatform(hostname);
    if (platform) {
      found[platform].add(normalizeSocialUrl(anchor.href));
    }
  }

  return {
    linkedin: [...found.linkedin].sort(),
    facebook: [...found.facebook].sort(),
    instagram: [...found.instagram].sort(),
    youtube: [...found.youtube].sort(),
    twitter: [...found.twitter].sort(),
    x: [...found.x].sort(),
  };
}

function normalizeSocialUrl(href: string): string {
  try {
    const url = new URL(href);
    url.hash = "";
    url.search = "";
    const normalized = url.href;
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return href;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapGuardErrorCode(guardError: UrlGuardError): WebsiteInspectionErrorCode {
  if (guardError.code === "DNS_RESOLVE_FAILED") return "DNS_RESOLVE_FAILED";
  return "INVALID_URL";
}

function isPlaywrightTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === "TimeoutError";
}

function isRedirectStatus(status: number | undefined): boolean {
  return (
    typeof status === "number" &&
    status >= 300 &&
    status < 400 &&
    status !== 304
  );
}

function findHeader(
  headers: CdpHeader[] | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  for (const header of headers) {
    if (header.name.toLowerCase() === lower) return header.value;
  }
  return null;
}

async function isRedirectTargetAllowed(
  location: string,
  fromUrl: string,
  isHostAllowed: (url: string) => Promise<boolean>,
): Promise<boolean> {
  let absolute: URL;

  try {
    absolute = new URL(location, fromUrl);
  } catch {
    return false;
  }

  const check = validateUrl(absolute.href);
  if (!check.ok) return false;

  return isHostAllowed(check.url);
}

class InspectionTimeoutError extends Error {
  constructor() {
    super("inspection timed out");
    this.name = "InspectionTimeoutError";
  }
}

function withTimeout<T>(ms: number, work: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new InspectionTimeoutError()), ms);
  });

  return Promise.race([work(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}