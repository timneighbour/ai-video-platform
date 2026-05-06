import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";

export default function Refunds() {
  useSEO({ title: "Refund Policy — WIZ AI", path: "/refunds", description: "WIZ AI's refund policy. 7-day refund window for new subscriptions. Credits restored automatically for failed builds." });
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[7.3rem] w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110" />
          </Link>
          <Link href="/" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">← Back to Home</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Refund Policy</h1>
          <p className="text-[#a1a1aa] text-sm">Last updated: 18 April 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-[#d4d4d8] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Our Commitment</h2>
            <p>We want you to be satisfied with WIZ AI. If you experience a genuine issue with the Service, we will work with you to resolve it fairly and promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Subscription Refunds</h2>
            <p>We offer a <strong>7-day refund window</strong> for new subscriptions. If you subscribe and are not satisfied, you may request a full refund within 7 days of your initial payment, provided you have not rendered more than 5 videos during that period.</p>
            <p className="mt-2">After 7 days, or once you have rendered more than 5 videos, subscription payments are non-refundable. You may cancel your subscription at any time to prevent future billing — your access will continue until the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Credit Purchases</h2>
            <p>Credit top-up purchases are <strong>non-refundable</strong> once credits have been applied to your account, except in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>A technical error on our platform caused credits to be incorrectly deducted.</li>
              <li>You were charged for a failed render that did not produce any output.</li>
            </ul>
            <p className="mt-2">In these cases, we will restore the affected credits to your account or issue a refund at our discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Failed Renders</h2>
            <p>If a video render fails due to a platform error (not due to your content or settings), the credits consumed will be automatically restored to your account within 24 hours. If this does not happen, please contact us and we will investigate and restore them manually.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. How to Request a Refund</h2>
            <p>To request a refund, email us at <a href="mailto:support@wiz-ai.io" className="text-[--color-gold] hover:text-[--color-gold] underline">support@wiz-ai.io</a> with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your account email address</li>
              <li>The date of the charge</li>
              <li>The reason for your refund request</li>
            </ul>
            <p className="mt-2">We aim to respond to all refund requests within <strong>2 business days</strong>. Approved refunds are processed within 5–10 business days, depending on your payment provider.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Exceptions</h2>
            <p>Refunds will not be issued in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>You changed your mind after using the Service extensively.</li>
              <li>Your account was suspended or terminated for violations of our <Link href="/terms" className="text-[--color-gold] hover:text-[--color-gold] underline">Terms of Service</Link>.</li>
              <li>The refund request is made after the 7-day window for subscriptions.</li>
              <li>Credits were consumed for successfully built videos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Contact</h2>
            <p>For any billing or refund questions, contact us at: <a href="mailto:support@wiz-ai.io" className="text-[--color-gold] hover:text-[--color-gold] underline">support@wiz-ai.io</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/8 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 text-sm text-[#a1a1aa]">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <a href="mailto:support@wiz-ai.io" className="hover:text-white transition-colors">support@wiz-ai.io</a>
        </div>
      </footer>
    </div>
  );
}
