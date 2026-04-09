const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-cropped_86dbad19.png";

export default function Refunds() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-8 w-auto object-contain" />
          </a>
          <a href="/" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">← Back to Home</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Refund Policy</h1>
          <p className="text-[#a1a1aa] text-sm">Last updated: 9 April 2025</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-[#d4d4d8] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Our Commitment</h2>
            <p>We want you to be satisfied with WizVid. If you experience a genuine issue with the Service, we will work with you to resolve it fairly and promptly.</p>
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
            <p>To request a refund, email us at <a href="mailto:support@wizvid.ai" className="text-purple-400 hover:text-purple-300 underline">support@wizvid.ai</a> with:</p>
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
              <li>Your account was suspended or terminated for violations of our <a href="/terms" className="text-purple-400 hover:text-purple-300 underline">Terms of Service</a>.</li>
              <li>The refund request is made after the 7-day window for subscriptions.</li>
              <li>Credits were consumed for successfully rendered videos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Contact</h2>
            <p>For any billing or refund questions, contact us at: <a href="mailto:support@wizvid.ai" className="text-purple-400 hover:text-purple-300 underline">support@wizvid.ai</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/8 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 text-sm text-[#a1a1aa]">
          <a href="/" className="hover:text-white transition-colors">Home</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="mailto:support@wizvid.ai" className="hover:text-white transition-colors">support@wizvid.ai</a>
        </div>
      </footer>
    </div>
  );
}
