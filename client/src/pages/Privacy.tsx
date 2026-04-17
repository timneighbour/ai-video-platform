import { Link } from "wouter";
const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[6.5rem] w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110" />
          </Link>
          <Link href="/" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">← Back to Home</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-[#a1a1aa] text-sm">Last updated: 9 April 2025</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-[#d4d4d8] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Who We Are</h2>
            <p>WIZ AI ("we", "us", "our") is an AI-powered video creation platform operated at <strong>www.wiz-ai.io</strong>. We are committed to protecting your personal data and being transparent about how we use it.</p>
            <p className="mt-2">For any privacy-related questions, contact us at: <a href="mailto:support@wiz-ai.io" className="text-purple-400 hover:text-purple-300 underline">support@wiz-ai.io</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. What Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account information:</strong> Your name, email address, and profile picture provided via your social login (e.g. Google).</li>
              <li><strong>Usage data:</strong> Pages visited, features used, video creation history, and session duration.</li>
              <li><strong>Uploaded content:</strong> Audio files, images, and text prompts you submit to generate videos. These are stored securely and used solely to deliver the service.</li>
              <li><strong>Payment information:</strong> Processed entirely by Stripe. We store only a Stripe Customer ID — no card numbers or financial details are held on our servers.</li>
              <li><strong>Technical data:</strong> IP address, browser type, device type, and cookies for session management.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, operate, and improve the WIZ AI platform.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To send transactional emails (receipts, password resets, service updates).</li>
              <li>To detect and prevent fraud or abuse.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your personal data to third parties. We do not use your uploaded content to train AI models without your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Storage and Retention</h2>
            <p>Your data is stored on secure cloud infrastructure (AWS). Uploaded audio and image files are retained for 90 days after your last activity, then automatically deleted unless you request earlier removal.</p>
            <p className="mt-2">Account data is retained for as long as your account is active. You may request deletion at any time by emailing <a href="mailto:support@wiz-ai.io" className="text-purple-400 hover:text-purple-300 underline">support@wiz-ai.io</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but this may affect your ability to log in.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Third-Party Services</h2>
            <p>We use the following third-party services, each with their own privacy policies:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>AWS S3</strong> — file storage</li>
              <li><strong>OpenAI Whisper</strong> — audio transcription</li>
              <li><strong>Kling AI / HeyGen / Runway ML</strong> — video generation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, delete, or export your personal data. To exercise any of these rights, contact us at <a href="mailto:support@wiz-ai.io" className="text-purple-400 hover:text-purple-300 underline">support@wiz-ai.io</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes by email or by displaying a notice on the platform. The "last updated" date at the top of this page reflects the most recent revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Contact</h2>
            <p>For any privacy concerns or data requests, please email: <a href="mailto:support@wiz-ai.io" className="text-purple-400 hover:text-purple-300 underline">support@wiz-ai.io</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/8 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 text-sm text-[#a1a1aa]">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/refunds" className="hover:text-white transition-colors">Refund Policy</Link>
          <a href="mailto:support@wiz-ai.io" className="hover:text-white transition-colors">support@wiz-ai.io</a>
        </div>
      </footer>
    </div>
  );
}
