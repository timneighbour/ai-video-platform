import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { openCookieSettings } from "@/components/CookieConsentBanner";

const CDN = "https://storage.googleapis.com/wzai-cdn-assets";
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png`;

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Helmet>
        <title>Cookie Policy — WIZ AI</title>
        <meta name="description" content="WIZ AI Cookie Policy — how we use cookies and how to manage your preferences." />
        <link rel="canonical" href="https://wiz-ai.io/cookie-policy" />
      </Helmet>

      {/* Nav */}
      <header className="border-b border-white/[0.05] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-10 w-auto object-contain" loading="lazy" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Cookie Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: 21 April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They allow the site to
              remember your actions and preferences over a period of time, so you do not have to re-enter them
              whenever you return. Cookies can also help us understand how you use our service so we can improve it.
            </p>
            <p className="mt-3">
              We also use similar technologies such as local storage, session storage, and pixel tags. This policy
              covers all of these technologies collectively referred to as "cookies".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Who sets cookies on WIZ AI?</h2>
            <p>
              Cookies on WIZ AI are set by us (first-party cookies) and by our trusted third-party service providers
              (third-party cookies). The third parties we use are listed in Section 4 below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Cookie categories</h2>
            <p>We group cookies into four categories:</p>

            <div className="mt-4 space-y-6">
              <div className="border border-white/[0.08] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-semibold text-white">Essential cookies</span>
                  <span className="text-[10px] font-medium text-[--color-gold] bg-[--color-gold]/10 border border-[--color-gold]/20 px-1.5 py-0.5 rounded-full">Always active</span>
                </div>
                <p>
                  These cookies are strictly necessary for the website to function and cannot be switched off. They
                  include session authentication tokens, security cookies (CSRF protection), load balancing cookies,
                  and cookies that remember your cookie consent choice.
                </p>
                <p className="mt-2 text-white/50 text-xs">Legal basis: Legitimate interests (GDPR Art. 6(1)(f)) — necessary for the provision of the service.</p>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-5">
                <span className="text-base font-semibold text-white block mb-2">Analytics cookies</span>
                <p>
                  These cookies help us understand how visitors interact with WIZ AI. We use this information to
                  improve the product, fix bugs, and understand which features are most used. Analytics data is
                  aggregated and does not identify individual users.
                </p>
                <p className="mt-2 text-white/50 text-xs">Legal basis: Your consent (GDPR Art. 6(1)(a)).</p>
                <p className="mt-2 text-white/50 text-xs">Providers: Google Analytics 4, Microsoft Clarity, Mixpanel.</p>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-5">
                <span className="text-base font-semibold text-white block mb-2">Marketing cookies</span>
                <p>
                  These cookies are used to deliver relevant advertisements and measure the effectiveness of our
                  marketing campaigns. They may be set by our advertising partners (Google Ads, Meta) and allow
                  those partners to build a profile of your interests.
                </p>
                <p className="mt-2 text-white/50 text-xs">Legal basis: Your consent (GDPR Art. 6(1)(a)).</p>
                <p className="mt-2 text-white/50 text-xs">Providers: Google Ads (AW-18107688120), Meta Pixel (when activated).</p>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-5">
                <span className="text-base font-semibold text-white block mb-2">Functional cookies</span>
                <p>
                  These cookies enable enhanced functionality and personalisation, such as remembering your language
                  preference, display settings, or whether you have dismissed a notification. If you disable these
                  cookies, some features may not work as expected.
                </p>
                <p className="mt-2 text-white/50 text-xs">Legal basis: Your consent (GDPR Art. 6(1)(a)).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Specific cookies we use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white/60 font-medium">Cookie / Technology</th>
                    <th className="text-left py-2 pr-4 text-white/60 font-medium">Provider</th>
                    <th className="text-left py-2 pr-4 text-white/60 font-medium">Category</th>
                    <th className="text-left py-2 text-white/60 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">wiz_session</td>
                    <td className="py-2 pr-4">WIZ AI</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2">Maintains your login session</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">wiz_cookie_consent_v1</td>
                    <td className="py-2 pr-4">WIZ AI</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2">Stores your cookie consent preferences</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">_ga, _ga_*</td>
                    <td className="py-2 pr-4">Google Analytics 4</td>
                    <td className="py-2 pr-4">Analytics</td>
                    <td className="py-2">Distinguishes users and sessions for analytics</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">_clck, _clsk</td>
                    <td className="py-2 pr-4">Microsoft Clarity</td>
                    <td className="py-2 pr-4">Analytics</td>
                    <td className="py-2">Session recording and heatmap analytics</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">mp_*</td>
                    <td className="py-2 pr-4">Mixpanel</td>
                    <td className="py-2 pr-4">Analytics</td>
                    <td className="py-2">Product analytics and user behaviour tracking</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">_gcl_au, _gads</td>
                    <td className="py-2 pr-4">Google Ads</td>
                    <td className="py-2 pr-4">Marketing</td>
                    <td className="py-2">Conversion tracking and remarketing</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white/80 font-mono text-xs">_fbp, _fbc</td>
                    <td className="py-2 pr-4">Meta (Facebook)</td>
                    <td className="py-2 pr-4">Marketing</td>
                    <td className="py-2">Ad targeting and conversion measurement (when Pixel is activated)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. How to manage your cookie preferences</h2>
            <p>
              You can change your cookie preferences at any time using the Cookie Settings panel. This allows you to
              accept or reject individual categories of cookies.
            </p>
            <div className="mt-4">
              <button
                onClick={openCookieSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[--color-gold] hover:bg-[--color-gold]/90 text-white font-semibold text-sm transition-colors"
              >
                Open Cookie Settings
              </button>
            </div>
            <p className="mt-4">
              You can also control cookies through your browser settings. Most browsers allow you to refuse cookies,
              delete existing cookies, or be notified when a cookie is set. Please note that disabling certain cookies
              may affect the functionality of WIZ AI.
            </p>
            <p className="mt-3">Browser opt-out guides:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">Microsoft Edge</a></li>
            </ul>
            <p className="mt-4">
              For Google Analytics opt-out, you can also install the{" "}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Google Consent Mode v2</h2>
            <p>
              WIZ AI uses Google Consent Mode v2. This means that when you visit our site, Google's advertising and
              analytics signals are set to denied by default. Only after you explicitly consent to analytics or
              marketing cookies will the relevant Google signals be enabled. This applies to Google Analytics 4,
              Google Ads, and any future Google services we integrate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Changes to this policy</h2>
            <p>
              We may update this Cookie Policy from time to time. When we do, we will update the "Last updated" date
              at the top of this page. If the changes are significant, we will re-display the cookie consent banner
              so you can review and update your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{" "}
              <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
          </Link>
          <div className="flex flex-wrap items-center gap-5 text-xs text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-white/60 transition-colors">Refund Policy</Link>
            <Link href="/cookie-policy" className="hover:text-white/60 transition-colors text-[--color-gold]/60">Cookie Policy</Link>
            <button onClick={openCookieSettings} className="hover:text-white/60 transition-colors text-left">Cookie Settings</button>
          </div>
          <p className="text-xs text-white/20">© {new Date().getFullYear()} WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
