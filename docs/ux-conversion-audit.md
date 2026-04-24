# UX & Conversion Audit — WIZ AI
**Date:** April 2026 | **Scope:** Full public user journey

---

## Summary

The site has strong visual production quality and a well-structured information architecture. The primary conversion risks are not in the design but in the **journey logic**: users are frequently sent to intermediate pages (product pages, landing pages) when they should be sent directly to the studio, the onboarding flow contains stale naming and a broken destination, and two studio pages have no auth gate at all. Several high-intent surfaces also lack the pricing clarity and trust signals needed to close the decision.

---

## Findings by Priority

---

### P1 — Live conversion blockers

---

#### 1. Onboarding page: WizAnimate card sends users to the product page, not the studio

**Page:** `/onboarding`
**Issue:** The WizAnimate card (`href: '/products/wizanimate'`) sends a user who has just chosen "I want to make character animation" to a marketing product page, not the studio. Every other card on the same page goes directly to a studio. This is a broken journey for what is a high-intent selection.
**Likely impact:** High. Users who pick WizAnimate are bounced out of the creation flow entirely and land on a page that asks them to make the same decision again.
**Fix:** Change `href` from `'/products/wizanimate'` to `WIZANIMATE_STUDIO_PAGE` (`/kids-video`).

---

#### 2. Onboarding page: WizAudio card still uses old brand name

**Page:** `/onboarding`
**Issue:** The WizAudio card title is `'WizAudio'` and the description reads "powered by WizAudio" — both of which were corrected to WizSound™ everywhere else in the previous phase. The Onboarding page was missed.
**Likely impact:** Medium. Users who have seen WizSound™ elsewhere will encounter a different name at the moment of product selection, which undermines brand confidence.
**Fix:** Update title to `'WizSound™'`, subtitle to `'AI Music Generator'`, and description to use WizSound™.

---

#### 3. KidsVideo and WizScore studios have no auth gate

**Pages:** `/kids-video`, `/wizscore`
**Issue:** Both pages have zero `isAuthenticated`, `AuthGate`, or `getLoginUrl` references. An unauthenticated user can open the studio and begin working, but will hit a silent failure or confusing error state when they try to generate or save — because the backend procedures are protected. There is no graceful prompt to sign in.
**Likely impact:** High. Users who discover these studios via direct links or organic search will invest time in the tool and then hit an invisible wall. This is a trust-destroying experience.
**Fix:** Add `AuthGate` modal triggered on first generation attempt, matching the pattern used in `MusicVideoAutopilot.tsx`.

---

#### 4. SEO landing page CTA goes to the product page, not the studio

**Page:** `/seo-landing` (and all keyword variants)
**Issue:** The `CTAButton` component links to `/music-video` (the WizVideo landing page), not `/music-video/create` (the studio). A user arriving from a paid or organic search ad for "AI music video generator" clicks the primary CTA and lands on another marketing page rather than the creation tool.
**Likely impact:** High. This adds one full extra click and page load to the highest-intent traffic on the site.
**Fix:** Change `CTAButton` href from `/music-video` to `WIZVIDEO_STUDIO_PAGE` (`/music-video/create`).

---

### P2 — Hesitation and drop-off risks

---

#### 5. Free plan watermark is not disclosed before signup

**Pages:** Homepage hero, Onboarding, product CTAs
**Issue:** The primary CTA across the site is "Create Your First Video — Free." The free plan includes a watermark on all exports (`watermark: true` in `plans.ts`). This is disclosed on the Pricing page in the feature comparison table, but it is not mentioned anywhere in the pre-signup journey — not in the hero, not in the Onboarding card, not in the AuthGate modal benefits list. Users who sign up expecting a clean free export will discover the watermark only after completing a build, which is a trust-damaging surprise.
**Likely impact:** Medium-high. Watermark surprises are a well-documented churn trigger for freemium tools.
**Fix:** Add a single honest line near the primary CTA: "Free exports include a watermark — upgrade anytime to remove it." This sets expectations without undermining the conversion.

---

#### 6. AuthGate benefits list contains a factually incorrect claim

**Component:** `AuthGate.tsx`
**Issue:** The AuthGate modal lists "Powered by WizSound — proprietary audio enhancement" as a benefit. WizSound™ is a product, not a feature of the free sign-up. More critically, the benefit list says "Create videos completely free — no credit card needed" and "Only pay when you're ready to build and download" — but does not mention the watermark on free builds. The modal is the last conversion gate before signup; it should be accurate.
**Likely impact:** Medium. Inaccurate benefit claims reduce trust when users discover the reality.
**Fix:** Replace the WizSound benefit line with something accurate (e.g., "Studio-grade audio and visuals built in"). Add a micro-note about watermarks on free builds.

---

#### 7. Product page CTAs bypass onboarding and go directly to studios

**Pages:** All `ProductPageTemplate` pages
**Issue:** Product page CTAs link directly to the studio (`ctaHref` = studio route). For unauthenticated users, this means clicking "Start Creating" on a product page drops them into the studio, which then shows an AuthGate. The user has to sign in, then is redirected back to the studio — but they have lost the context of which product they were exploring. The Onboarding page exists precisely to handle this selection moment, but product pages skip it entirely.
**Likely impact:** Medium. The journey is functional but creates a jarring context switch for new users.
**Fix:** For unauthenticated users, product page CTAs could route to `/onboarding` (with a `?product=wizanimate` param to pre-select the relevant card), or the AuthGate `returnPath` should be set to the correct studio so the redirect lands correctly after login.

---

#### 8. Pricing page plan CTA for unauthenticated users sends to OAuth login, not onboarding

**Page:** `/pricing`
**Issue:** When an unauthenticated user clicks a plan CTA (e.g., "Start Creating" on the Starter plan), the handler calls `window.location.href = getLoginUrl()` — which sends them directly to the OAuth login screen, bypassing the Onboarding product selection entirely. A user who arrived at Pricing from the homepage has not yet chosen a product; sending them straight to login before they have selected what they want to create is premature.
**Likely impact:** Medium. Users who are not yet committed to a specific product will feel pushed rather than guided.
**Fix:** Route unauthenticated plan clicks to `/onboarding` instead of directly to login. After onboarding product selection, the studio's AuthGate handles the login with the correct `returnPath`.

---

#### 9. CTA label inconsistency across product pages

**Pages:** `products/index.tsx` (various)
**Issue:** Product page CTAs use four different labels for what is functionally the same action (enter the studio): "Start Creating", "Create Your Video", "Build Your Video", "Boost Your Video", "Try WizPilot Free", "Open Studio". None of these are wrong individually, but together they signal that the site has not decided what it wants users to do. High-converting sites use one primary CTA verb consistently.
**Likely impact:** Low-medium. Inconsistency reduces the perceived intentionality of the product.
**Fix:** Standardise all product page primary CTAs to one of: "Start Creating Free" or "Open Studio — Free". Update `products.ts` registry `ctaLabel` values accordingly.

---

#### 10. No pricing anchor or credit cost shown on studio pages before the build action

**Pages:** All studio pages
**Issue:** Users can enter a studio, configure a full project, and reach the build/generate button without ever seeing what it will cost. The credit cost is only revealed at the point of commitment (the build modal). For users on the free plan, this means they may not realise they are spending one of their 2 free credits until after they have clicked.
**Likely impact:** Medium. Surprise costs at the point of commitment are a well-documented conversion and retention risk.
**Fix:** Add a small persistent credit cost indicator near the primary build/generate button in each studio (e.g., "This build uses 1 Build Credit — you have 2 remaining").

---

### P3 — Messaging and trust signal gaps

---

#### 11. Homepage hero headline is generic

**Page:** `/` (Hero section)
**Issue:** The primary headline is "Create anything. Instantly." This is accurate but undifferentiated — it could describe any AI creative tool. The eyebrow label ("The AI Creative Studio for Serious Creators") is stronger and more specific, but it is in small caps above the headline rather than being the headline itself. The subheadline ("Music. Videos. Animation. Images. Shorts.") does the real product differentiation work, but it is below the fold on mobile.
**Likely impact:** Low-medium. The page is visually strong, but the headline does not give a first-time visitor a reason to stay that is specific to WIZ AI.
**Fix:** Consider leading with the differentiator: e.g., "Music videos. Shorts. Animation. All from one idea." or "The only AI studio that goes from idea to finished video." Test against the current headline.

---

#### 12. No quantified social proof anywhere on the site

**Pages:** Homepage, Pricing page
**Issue:** The "Trusted by real creators" section on the homepage uses category imagery (musicians, YouTubers, brands, animators) but no numbers, no named creators, no review counts, and no platform ratings. The Pricing page "Creators love WIZ AI" section also uses category cards rather than testimonials. A comment in the codebase reads "Avatar constants removed — fictional testimonials replaced with honest use-case cards." This is the right call ethically, but the result is a trust section with no trust signals.
**Likely impact:** Medium. For a paid creative tool, the absence of any social proof (even aggregate numbers like "10,000+ videos created") is a hesitation point for first-time buyers.
**Fix:** Add a single honest aggregate metric (total videos created, total users, or a platform rating if available). If no real metrics are available yet, remove the "Trusted by" heading entirely and replace with a "How it works" or "What you get" section that does not imply social proof it cannot back up.

---

#### 13. No money-back guarantee or risk-reversal signal near plan CTAs

**Page:** `/pricing`
**Issue:** The Pricing page has strong visual hierarchy and clear plan differentiation, but there is no risk-reversal signal (refund policy, free trial period, cancel anytime) near the plan purchase buttons. The FAQ section does address this, but it is far below the fold.
**Likely impact:** Low-medium. For a subscription product, a "cancel anytime" or "7-day refund" callout near the CTA button is a standard conversion accelerator.
**Fix:** Add a single line below each plan CTA button: "Cancel anytime. No lock-in." or similar, sourced from the actual refund policy.

---

#### 14. Mobile: sticky CTA bar is dismissible and does not reappear

**Page:** `/` (mobile)
**Issue:** The mobile sticky CTA bar at the bottom of the screen can be dismissed by the user and does not reappear. Once dismissed, the user has no persistent CTA on mobile unless they scroll back to the hero. The bar is the primary conversion surface on mobile.
**Likely impact:** Low-medium. Users who dismiss it accidentally or prematurely lose their primary conversion path.
**Fix:** Consider making the bar re-appear after the user scrolls past a certain depth (e.g., past the product grid), or remove the dismiss button entirely since the bar is non-intrusive.

---

#### 15. "Help" nav link has no visible destination indicator

**Page:** All pages with top nav
**Issue:** The "Help" nav link exists in the top navigation but there is no indication of what it contains (FAQ, docs, support chat, community). Users who have a question before converting will click Help and may find it insufficient, then leave rather than returning to the conversion flow.
**Likely impact:** Low. Worth noting as a friction point for users in the consideration phase.
**Fix:** Ensure the Help page has a clear structure (FAQ, contact, docs) and a CTA back to the main creation flow.

---

## Summary Table

| # | Issue | Pages | Impact | Fix complexity |
|---|---|---|---|---|
| 1 | WizAnimate Onboarding card → product page not studio | `/onboarding` | High | Trivial (1 line) |
| 2 | WizAudio name in Onboarding | `/onboarding` | Medium | Trivial (2 lines) |
| 3 | KidsVideo + WizScore: no auth gate | `/kids-video`, `/wizscore` | High | Low |
| 4 | SEO landing CTA → product page not studio | `/seo-landing` | High | Trivial (1 line) |
| 5 | Watermark not disclosed pre-signup | Homepage, Onboarding, AuthGate | Medium-High | Low |
| 6 | AuthGate benefits list inaccurate | `AuthGate.tsx` | Medium | Low |
| 7 | Product page CTAs skip onboarding for new users | All product pages | Medium | Low-Medium |
| 8 | Pricing plan CTA → OAuth login not onboarding | `/pricing` | Medium | Low |
| 9 | CTA label inconsistency across product pages | All product pages | Low-Medium | Low |
| 10 | No credit cost shown in studio before build | All studio pages | Medium | Medium |
| 11 | Hero headline is generic | `/` | Low-Medium | Low |
| 12 | No quantified social proof | `/`, `/pricing` | Medium | Low-Medium |
| 13 | No risk-reversal signal near plan CTAs | `/pricing` | Low-Medium | Trivial |
| 14 | Mobile sticky CTA is dismissible permanently | `/` (mobile) | Low-Medium | Low |
| 15 | Help nav has no destination indicator | All pages | Low | Low |

---

## Recommended Fix Order

**Immediate (trivial effort, high impact):**
1. Fix WizAnimate Onboarding href → `/kids-video`
2. Fix WizAudio → WizSound™ in Onboarding
3. Fix SEO landing CTA → `/music-video/create`
4. Add "cancel anytime" line to Pricing plan CTAs

**Short-term (low effort, medium-high impact):**
5. Add AuthGate to KidsVideo and WizScore studios
6. Add watermark disclosure near primary CTAs
7. Fix AuthGate benefits list accuracy
8. Route unauthenticated Pricing plan clicks to `/onboarding`

**Medium-term (moderate effort, medium impact):**
9. Standardise product page CTA labels via `products.ts` registry
10. Add credit cost indicator to studio build buttons
11. Add honest aggregate social proof metric or remove "Trusted by" heading
12. Fix mobile sticky CTA dismiss behaviour

**Longer-term (strategic):**
13. Improve hero headline specificity
14. Add risk-reversal signal near plan CTAs (requires confirmed refund policy)
15. Improve Help page structure and add return CTA
