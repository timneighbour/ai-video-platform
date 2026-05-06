import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { openCookieSettings } from "@/components/CookieConsentBanner";

const CDN = "https://storage.googleapis.com/wzai-cdn-assets";
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047.png`;

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Helmet>
        <title>Privacy Policy — WIZ AI</title>
        <meta name="description" content="WIZ AI Privacy Policy — how we collect, use, and protect your personal data." />
      </Helmet>

      {/* Nav */}
      <header className="border-b border-white/[0.05] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-10 w-auto object-contain" loading="lazy" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: 21 April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Who we are</h2>
            <p>
              WIZ AI ("we", "us", "our") operates the website at <strong className="text-white">wiz-ai.io</strong> and
              provides AI-powered video creation tools. We are the data controller for personal data collected through
              this service.
            </p>
            <p className="mt-3">
              Contact: <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. What data we collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Account data</h3>
                <p>When you create an account via Manus OAuth, we receive your name, email address, and a unique
                  identifier. We store this to manage your account and provide the service.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Content you create</h3>
                <p>We store the videos, images, audio files, scripts, and other creative content you generate or upload
                  using WIZ AI. This includes storyboards, scene data, character photos, and project metadata.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Biometric-adjacent data (WizPerformer)</h3>
                <p>If you use WizPerformer, you may upload a photograph of a person (yourself or a person you have
                  authority to represent). This image is processed by our AI generation infrastructure to create an
                  AI performer. We treat this data with heightened care and process it only with your explicit consent.
                  See Section 6 for details.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Payment data</h3>
                <p>Payments are processed by Stripe. We do not store full card numbers, CVV codes, or raw payment
                  instrument data. We store Stripe customer IDs and subscription identifiers to manage your account.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Usage data</h3>
                <p>We collect information about how you use WIZ AI, including pages visited, features used, generation
                  jobs submitted, and error logs. This helps us improve the product.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Technical data</h3>
                <p>IP address, browser type, operating system, device type, and referral URL. Collected automatically
                  when you access the service.</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white/90 mb-1">Cookie data</h3>
                <p>See our <Link href="/cookie-policy" className="text-[--color-gold] hover:underline">Cookie Policy</Link> for
                  full details of the cookies and tracking technologies we use.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How we use your data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white/60 font-medium">Purpose</th>
                    <th className="text-left py-2 text-white/60 font-medium">Legal basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr><td className="py-2 pr-4">Providing the WIZ AI service</td><td className="py-2">Contract (Art. 6(1)(b))</td></tr>
                  <tr><td className="py-2 pr-4">Processing payments via Stripe</td><td className="py-2">Contract (Art. 6(1)(b))</td></tr>
                  <tr><td className="py-2 pr-4">Managing your account and subscription</td><td className="py-2">Contract (Art. 6(1)(b))</td></tr>
                  <tr><td className="py-2 pr-4">Sending transactional emails (receipts, alerts)</td><td className="py-2">Contract (Art. 6(1)(b))</td></tr>
                  <tr><td className="py-2 pr-4">Improving the product through analytics</td><td className="py-2">Consent (Art. 6(1)(a))</td></tr>
                  <tr><td className="py-2 pr-4">Marketing and advertising</td><td className="py-2">Consent (Art. 6(1)(a))</td></tr>
                  <tr><td className="py-2 pr-4">Security, fraud prevention, and legal compliance</td><td className="py-2">Legitimate interests (Art. 6(1)(f))</td></tr>
                  <tr><td className="py-2 pr-4">Processing WizPerformer photos</td><td className="py-2">Explicit consent (Art. 9(2)(a))</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Who we share your data with</h2>
            <p>We do not sell your personal data. We share data only with the following categories of recipients:</p>
            <div className="mt-4 space-y-3">
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">AI generation infrastructure</span>
                <p className="text-sm mt-1">We use a third-party AI video generation provider to process video and image generation jobs. Your content (prompts, reference images, audio) is transmitted to this provider to fulfil your generation request. All processing is governed by data processing agreements that meet GDPR standards.</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">Stripe (payment processing)</span>
                <p className="text-sm mt-1">Stripe processes all payment transactions. Stripe is a data controller for payment data under its own privacy policy. We share your email and name with Stripe to create a customer record.</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">Analytics providers (with your consent)</span>
                <p className="text-sm mt-1">Google Analytics 4, Microsoft Clarity, and Mixpanel receive anonymised usage data when you consent to analytics cookies. Google Ads and Meta Pixel receive conversion signals when you consent to marketing cookies.</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">Cloud storage and CDN</span>
                <p className="text-sm mt-1">Your generated videos and uploaded files are stored in cloud object storage. CDN services are used to deliver assets efficiently.</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">Authentication</span>
                <p className="text-sm mt-1">We use Manus OAuth for account creation and login. Your identity data (name, email, unique ID) is shared with our authentication provider.</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90">Legal and regulatory</span>
                <p className="text-sm mt-1">We may disclose data to law enforcement or regulatory authorities where required by law.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. International data transfers</h2>
            <p>
              Some of our service providers operate outside the UK and European Economic Area (EEA). Where we transfer
              personal data internationally, we ensure appropriate safeguards are in place, such as Standard Contractual
              Clauses (SCCs) approved by the European Commission, or equivalent UK mechanisms. You can request details
              of the specific safeguards by contacting us at{" "}
              <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. WizPerformer — biometric-adjacent data</h2>
            <p>
              WizPerformer allows you to upload a photograph to create an AI-generated performer for your video. This
              photograph may constitute biometric data or data concerning a person's physical characteristics.
            </p>
            <p className="mt-3">Before uploading, you must:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Confirm you have the right to use the photograph (it is of yourself, or you have explicit written consent from the person depicted)</li>
              <li>Confirm the person depicted is 18 years of age or older</li>
              <li>Confirm you understand the photo will be processed by AI to generate a performer likeness</li>
              <li>Confirm you have read and understood this Privacy Policy</li>
            </ul>
            <p className="mt-3">
              We log your consent with a timestamp and the version of this policy at the time of consent. You can
              withdraw consent and delete your performer photos at any time from your Account settings.
            </p>
            <p className="mt-3">
              WizPerformer is entirely optional. You can use WIZ AI to create videos without uploading any face images.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white/60 font-medium">Data type</th>
                    <th className="text-left py-2 text-white/60 font-medium">Retention period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr><td className="py-2 pr-4">Account data</td><td className="py-2">Until account deletion + 30 days</td></tr>
                  <tr><td className="py-2 pr-4">Generated videos and projects</td><td className="py-2">Until you delete them or your account is deleted</td></tr>
                  <tr><td className="py-2 pr-4">WizPerformer photos</td><td className="py-2">Until you delete them or withdraw consent</td></tr>
                  <tr><td className="py-2 pr-4">Payment records</td><td className="py-2">7 years (UK tax law requirement)</td></tr>
                  <tr><td className="py-2 pr-4">Usage logs</td><td className="py-2">90 days</td></tr>
                  <tr><td className="py-2 pr-4">Analytics data</td><td className="py-2">As per provider settings (GA4: 14 months)</td></tr>
                  <tr><td className="py-2 pr-4">Consent records</td><td className="py-2">3 years from consent date</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Your rights</h2>
            <p>Under UK GDPR and EU GDPR, you have the following rights:</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { right: "Right of access", desc: "Request a copy of the personal data we hold about you." },
                { right: "Right to rectification", desc: "Request correction of inaccurate or incomplete data." },
                { right: "Right to erasure", desc: "Request deletion of your personal data (subject to legal retention requirements)." },
                { right: "Right to restrict processing", desc: "Request that we limit how we use your data." },
                { right: "Right to data portability", desc: "Receive your data in a structured, machine-readable format." },
                { right: "Right to object", desc: "Object to processing based on legitimate interests." },
                { right: "Right to withdraw consent", desc: "Withdraw consent at any time without affecting prior processing." },
                { right: "Right to complain", desc: "Lodge a complaint with the ICO (UK) or your local supervisory authority." },
              ].map(({ right, desc }) => (
                <div key={right} className="border border-white/[0.08] rounded-xl p-4">
                  <span className="font-semibold text-white/90 text-sm">{right}</span>
                  <p className="text-xs text-white/50 mt-1">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>.
              We will respond within 30 days. Some rights can also be exercised directly from your{" "}
              <Link href="/account" className="text-[--color-gold] hover:underline">Account settings</Link>.
            </p>
            <p className="mt-3">
              To complain to the UK Information Commissioner's Office:{" "}
              <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="text-[--color-gold] hover:underline">ico.org.uk</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Cookies and tracking</h2>
            <p>
              We use cookies and similar tracking technologies. You can manage your preferences at any time:
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
              For full details, see our <Link href="/cookie-policy" className="text-[--color-gold] hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your personal data against
              unauthorised access, loss, or disclosure. These include encrypted connections (HTTPS), access controls,
              and regular security reviews. However, no internet transmission is completely secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Children</h2>
            <p>
              WIZ AI is not directed at children under 13 years of age. We do not knowingly collect personal data from
              children under 13. If you believe a child has provided us with personal data, please contact us
              immediately at{" "}
              <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you
              by email or by displaying a prominent notice on the website. The "Last updated" date at the top of this
              page will always reflect the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Contact</h2>
            <p>
              For any privacy-related questions, requests, or complaints:
            </p>
            <p className="mt-2">
              Email: <a href="mailto:privacy@wiz-ai.io" className="text-[--color-gold] hover:underline">privacy@wiz-ai.io</a>
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
            <Link href="/privacy" className="hover:text-white/60 transition-colors text-[--color-gold]/60">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-white/60 transition-colors">Refund Policy</Link>
            <Link href="/cookie-policy" className="hover:text-white/60 transition-colors">Cookie Policy</Link>
            <button onClick={openCookieSettings} className="hover:text-white/60 transition-colors text-left">Cookie Settings</button>
          </div>
          <p className="text-xs text-white/20">© {new Date().getFullYear()} WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
