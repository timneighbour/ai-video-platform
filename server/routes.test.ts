/**
 * Routing constants tests
 * Verifies the WizAnimate forward flow:
 *   Home/Nav → /products/wizanimate → /ai-animation-maker → /kids-video
 * and that no circular routing exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../client/src");

function readFile(relPath: string) {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

// ── Import the constants directly ────────────────────────────────────────────
// We can't import TS from a server test directly, so we read and parse the file
const routesFile = readFile("lib/routes.ts");

describe("routes.ts constants", () => {
  it("exports WIZANIMATE_PRODUCT_PAGE = /products/wizanimate", () => {
    expect(routesFile).toContain('WIZANIMATE_PRODUCT_PAGE = "/products/wizanimate"');
  });

  it("exports WIZANIMATE_SEO_PAGE = /ai-animation-maker", () => {
    expect(routesFile).toContain('WIZANIMATE_SEO_PAGE = "/ai-animation-maker"');
  });

  it("exports WIZANIMATE_STUDIO_PAGE = /kids-video", () => {
    expect(routesFile).toContain('WIZANIMATE_STUDIO_PAGE = "/kids-video"');
  });
});

describe("WizAnimate forward routing chain", () => {
  it("products/index.tsx WizAnimate ctaHref uses WIZANIMATE_SEO_PAGE (not hardcoded)", () => {
    const content = readFile("pages/products/index.tsx");
    // ctaHref must use the constant, not a hardcoded string
    expect(content).toContain("ctaHref: WIZANIMATE_SEO_PAGE");
    expect(content).not.toContain('ctaHref: "/ai-animation-maker"');
  });

  it("AiAnimationMaker.tsx primary CTAs use WIZANIMATE_STUDIO_PAGE (not /products/wizanimate)", () => {
    const content = readFile("pages/AiAnimationMaker.tsx");
    // Must not send user back to product page (circular loop)
    expect(content).not.toContain('href: "/products/wizanimate"');
    // Must use the studio constant or hardcoded /kids-video for the CTA
    const hasStudioConstant = content.includes("WIZANIMATE_STUDIO_PAGE");
    const hasHardcodedStudio = content.includes('"/kids-video"');
    expect(hasStudioConstant || hasHardcodedStudio).toBe(true);
  });

  it("WizProductGrid.tsx WizAnimate card uses WIZANIMATE_PRODUCT_PAGE (not /ai-animation-maker)", () => {
    const content = readFile("components/WizProductGrid.tsx");
    // Homepage card must go to product page, not SEO page
    expect(content).toContain("WIZANIMATE_PRODUCT_PAGE");
    expect(content).not.toContain('href: "/ai-animation-maker"');
  });

  it("PublicNavBar.tsx WizAnimate link uses WIZANIMATE_PRODUCT_PAGE", () => {
    const content = readFile("components/PublicNavBar.tsx");
    expect(content).toContain("WIZANIMATE_PRODUCT_PAGE");
    expect(content).not.toContain('href: "/products/wizanimate"');
  });

  it("Home.tsx WizAnimate product card uses WIZANIMATE_PRODUCT_PAGE", () => {
    const content = readFile("pages/Home.tsx");
    expect(content).toContain("WIZANIMATE_PRODUCT_PAGE");
    expect(content).not.toContain('href: "/products/wizanimate"');
  });

  it("Home.tsx Animators persona CTA uses WIZANIMATE_SEO_PAGE", () => {
    const content = readFile("pages/Home.tsx");
    expect(content).toContain("WIZANIMATE_SEO_PAGE");
    expect(content).not.toContain('href: "/ai-animation-maker"');
  });
});

describe("No circular routing", () => {
  it("AiAnimationMaker.tsx does not link back to /products/wizanimate as a primary CTA", () => {
    const content = readFile("pages/AiAnimationMaker.tsx");
    // The only allowed occurrence of /products/wizanimate in AiAnimationMaker is the
    // breadcrumb path field (which identifies the current page, not a navigation target).
    // Count occurrences — should be 0 href occurrences
    const hrefMatches = content.match(/href[:\s=]+["'`]\/products\/wizanimate["'`]/g) || [];
    expect(hrefMatches.length).toBe(0);
  });

  it("products/index.tsx WizAnimate ctaHref does not point to /kids-video (must go to SEO page first)", () => {
    const content = readFile("pages/products/index.tsx");
    expect(content).not.toContain('ctaHref: "/kids-video"');
    expect(content).not.toContain("ctaHref: WIZANIMATE_STUDIO_PAGE");
  });
});
