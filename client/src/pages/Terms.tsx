import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { openCookieSettings } from "@/components/CookieConsentBanner";

const CDN = "https://storage.googleapis.com/wzai-cdn-assets";
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png`;

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Helmet>
        <title>Terms of Service — WIZ AI</title>
        <meta name="description" content="WIZ AI Terms of Service — your rights, content ownership, subscription terms, and acceptable use policy." />
        <link rel="canonical" href="https://wiz-ai.io/terms" />
      </Helmet>

      {/* Nav */}
      <header className="border-b border-white/[0.05] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-10 w-auto object-contain" loading="lazy" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refunds" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: 21 April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using WIZ AI ("the Service") at <strong className="text-white">wiz-ai.io</strong>, you agree
              to be bound by these Terms of Service and our <Link href="/privacy" className="text-[--color-gold] hover:underline">Privacy Policy</Link>.
              If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use WIZ AI. By using the Service, you represent that you meet this
              requirement. Users under 18 must have parental or guardian consent. WIZ AI is not directed at children
              under 13 and we do not knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity
              that occurs under your account. Notify us immediately at{" "}
              <a href="mailto:support@wiz-ai.io" className="text-[--color-gold] hover:underline">support@wiz-ai.io</a> if
              you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use Policy</h2>
            <p className="mb-4">
              You agree to use WIZ AI only for lawful purposes and in accordance with these Terms. The following
              categories of use are strictly prohibited:
            </p>

            <div className="space-y-4">
              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90 text-sm">Illegal and harmful content</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Content that is illegal under UK, EU, or applicable local law</li>
                  <li>Child sexual abuse material (CSAM) or any sexual content involving minors</li>
                  <li>Content that incites, glorifies, or facilitates violence, terrorism, or hate crimes</li>
                  <li>Content that constitutes harassment, stalking, or targeted abuse of individuals</li>
                  <li>Content designed to facilitate self-harm or suicide</li>
                </ul>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90 text-sm">Deepfakes and identity misuse</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Creating non-consensual intimate imagery (NCII) or sexual deepfakes of any person</li>
                  <li>Creating deepfakes of real individuals without their explicit written consent</li>
                  <li>Impersonating public figures, politicians, or celebrities in a misleading or defamatory way</li>
                  <li>Creating content designed to deceive viewers into believing AI-generated footage is real news or documentary evidence</li>
                  <li>Using WizPerformer to generate a likeness of any person without their explicit consent</li>
                </ul>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90 text-sm">Intellectual property violations</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Uploading content you do not own or have the right to use</li>
                  <li>Generating content that infringes third-party copyright, trademark, or other intellectual property rights</li>
                  <li>Using WIZ AI to reproduce, replicate, or closely imitate copyrighted works without authorisation</li>
                </ul>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90 text-sm">Platform abuse</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Attempting to reverse-engineer, decompile, or extract the underlying AI models or systems</li>
                  <li>Scraping, crawling, or bulk-downloading content or data from WIZ AI</li>
                  <li>Circumventing usage limits, Build Credits, or subscription restrictions</li>
                  <li>Using automated scripts or bots to access the Service without prior written consent</li>
                  <li>Sharing account credentials or reselling access to WIZ AI</li>
                  <li>Attempting to gain unauthorised access to other users' accounts or data</li>
                </ul>
              </div>

              <div className="border border-white/[0.08] rounded-xl p-4">
                <span className="font-semibold text-white/90 text-sm">Misinformation and fraud</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Creating content designed to spread false information that could cause public harm</li>
                  <li>Using WIZ AI to generate fraudulent documents, fake evidence, or deceptive materials</li>
                  <li>Creating content intended to manipulate elections or undermine democratic processes</li>
                </ul>
              </div>
            </div>

            <p className="mt-4">
              We reserve the right to remove content, suspend, or terminate accounts that violate this Acceptable Use
              Policy, with or without prior notice. We may also report illegal content to relevant authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Content Ownership and AI Output</h2>
            <p><strong className="text-white">Your input content:</strong> You retain ownership of any audio, images, or text you upload to WIZ AI.</p>
            <p className="mt-3"><strong className="text-white">AI-generated output:</strong> Videos and other content generated by WIZ AI are provided to you under a non-exclusive licence. You may use, share, and monetise AI-generated content for personal and commercial purposes, subject to the following:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>You must not claim that AI-generated content was created entirely by a human in contexts where that distinction is legally or ethically required.</li>
              <li>WIZ AI retains the right to use anonymised, aggregated output data for service improvement.</li>
              <li>We do not guarantee that AI-generated content is free from third-party intellectual property claims. You are responsible for ensuring your use complies with applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Build Credits and Subscriptions</h2>
            <p>
              WIZ AI operates on a Build Credit system. Credits are consumed when you build videos. Unused credits do
              not roll over between billing periods unless stated in your plan. Subscription fees are billed in advance
              and are non-refundable except as set out in our{" "}
              <Link href="/refunds" className="text-[--color-gold] hover:underline">Refund Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Service Availability</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted access. We may perform maintenance,
              updates, or experience downtime. We are not liable for losses arising from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, WIZ AI and its operators shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill,
              arising from your use of the Service. Our total liability to you for any claim shall not exceed the
              amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms,
              with or without notice. You may cancel your account at any time from your{" "}
              <Link href="/account" className="text-[--color-gold] hover:underline">Account settings</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes
              acceptance of the revised Terms. We will notify you of material changes by email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the
              exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{" "}
              <a href="mailto:support@wiz-ai.io" className="text-[--color-gold] hover:underline">support@wiz-ai.io</a>
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
            <Link href="/terms" className="hover:text-white/60 transition-colors text-[--color-gold]/60">Terms of Service</Link>
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
