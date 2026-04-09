import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Sparkles, Video, Mic, Wand2, Check } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import VideoCarousel from "@/components/VideoCarousel";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const faqs = [
    {
      id: "1",
      question: "What are credits and how do they work?",
      answer: "Credits are the currency of our platform. Each AI tool generation consumes credits based on complexity and duration. Your subscription includes monthly credits, and you can purchase additional packs anytime.",
    },
    {
      id: "2",
      question: "Can I upgrade or downgrade my subscription?",
      answer: "Yes, you can change your subscription tier at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle.",
    },
    {
      id: "3",
      question: "Do my credits roll over each month?",
      answer: "Monthly subscription credits reset each billing cycle. However, credits purchased through top-up packs don't expire and can be used anytime.",
    },
    {
      id: "4",
      question: "Is there a free trial?",
      answer: "Yes! Sign up for free to get started. New users receive a small credit allowance to explore our AI tools risk-free.",
    },
    {
      id: "5",
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express) and process payments securely through Stripe.",
    },
    {
      id: "6",
      question: "Can I cancel my subscription anytime?",
      answer: "Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
    },
  ];

  const features = [
    {
      icon: Video,
      title: "Text-to-Video",
      description: "Transform your ideas into cinematic videos with AI-powered generation",
    },
    {
      icon: Mic,
      title: "Lip-Sync & Avatars",
      description: "Create realistic talking avatars with perfect audio synchronization",
    },
    {
      icon: Wand2,
      title: "Video-to-Video",
      description: "Apply artistic styles and transformations to existing videos",
    },
    {
      icon: Sparkles,
      title: "AI Voiceover",
      description: "Generate natural-sounding narration in multiple languages and voices",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: 19,
      credits: 1000,
      description: "Perfect for getting started",
      features: ["1,000 credits/month", "Standard quality", "Watermark-free", "Priority queue"],
      cta: "Get Started",
    },
    {
      name: "Pro",
      price: 49,
      credits: 3000,
      description: "For professional creators",
      features: ["3,000 credits/month", "4K upscaling", "Commercial license", "Early access"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Business",
      price: 149,
      credits: 10000,
      description: "For teams and studios",
      features: ["10,000 credits/month", "API access", "Team collaboration", "Dedicated support"],
      cta: "Contact Sales",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-purple-500/20 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/Wizvidlogowithneonmagicflair(1)_03506e50.png" 
              alt="WizVid" 
              className="h-8 w-auto" 
            />
            <span className="text-lg font-bold text-white">WizVid</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <a href="/autopilot" className="text-white hover:text-purple-400 font-medium">Autopilot</a>
                <a href="/dashboard" className="text-white hover:text-purple-400">Dashboard</a>
                <a href="/account" className="text-white hover:text-purple-400">Account</a>
                <Button 
                  variant="outline" 
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => logout()}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-white hover:text-purple-400">Sign In</a>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <a href={getLoginUrl()} className="text-white">Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Competitive Advantage Banner */}
      <div className="bg-gradient-to-r from-green-900/40 via-emerald-900/40 to-green-900/40 border-b border-green-500/20 py-2.5 px-4 text-center">
        <p className="text-sm text-green-300 font-medium">
          <span className="text-green-400 font-bold">WizVid Advantage:</span> Regenerate your storyboard as many times as you need — completely free. Credits only charged when you render your final video.
          <a href="/autopilot" className="ml-3 underline hover:text-white transition">Try Autopilot →</a>
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Create Stunning AI Videos
              </span>
              <br />
              <span className="text-white">In Seconds</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Transform your ideas into professional-quality videos using cutting-edge AI. Text-to-video, lip-sync avatars, video transformation, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-2"
                asChild
              >
                <a href={getLoginUrl()}><Sparkles className="h-4 w-4" />Start Creating Free</a>
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10 gap-2"
                asChild
              >
                <a href="/autopilot"><Wand2 className="h-4 w-4" />Try Autopilot</a>
              </Button>
            </div>
            {/* Free trial callout */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" />50 free credits on sign-up</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" />Free storyboard regeneration</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" />No credit card required</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" />Save 33% with annual billing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Carousel Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">See What You Can Create</h2>
          <p className="text-center text-gray-400 mb-12">Explore stunning examples from our AI tools</p>
          <VideoCarousel 
            videos={[
              {
                id: "1",
                title: "Cinematic Landscape",
                description: "A breathtaking journey through mountains and valleys created entirely from text",
                videoUrl: "https://cdn.pixabay.com/vimeo/335032876/small_4f8f1c8f-1f1f-4f1f-8f1f-1f1f1f1f1f1f.mp4",
                tool: "text-to-video",
                duration: 15,
              },
              {
                id: "2",
                title: "Professional Spokesperson",
                description: "Realistic talking avatar delivering your message with perfect lip-sync",
                videoUrl: "https://cdn.pixabay.com/vimeo/335032876/small_4f8f1c8f-1f1f-4f1f-8f1f-1f1f1f1f1f1f.mp4",
                tool: "lip-sync",
                duration: 20,
              },
              {
                id: "3",
                title: "Artistic Transformation",
                description: "Original video transformed with stunning artistic effects and style transfer",
                videoUrl: "https://cdn.pixabay.com/vimeo/335032876/small_4f8f1c8f-1f1f-4f1f-8f1f-1f1f1f1f1f1f.mp4",
                tool: "video-to-video",
                duration: 18,
              },
              {
                id: "4",
                title: "Multilingual Narration",
                description: "Natural-sounding voiceover in 160+ languages with multiple tone options",
                videoUrl: "https://cdn.pixabay.com/vimeo/335032876/small_4f8f1c8f-1f1f-4f1f-8f1f-1f1f1f1f1f1f.mp4",
                tool: "voiceover",
                duration: 12,
              },
            ]}
            autoPlayInterval={6000}
          />
        </div>
      </section>

      {/* Why WizVid Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-white">Why Creators Choose WizVid</h2>
          <p className="text-center text-gray-400 mb-10">Built differently from the competition</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🆓", title: "Free Storyboards", desc: "Regenerate your storyboard unlimited times at zero cost — pay only when you render" },
              { icon: "🤖", title: "4 AI Engines", desc: "Kling AI, Seedance 2.0, Runway ML & HeyGen — the best models in one platform" },
              { icon: "💰", title: "Best Value", desc: "Starting at $19/mo — 33% cheaper than competitors. Save even more with annual billing" },
              { icon: "🎭", title: "Lip-Sync Avatars", desc: "Create talking avatars in 160+ languages — a feature competitors simply don't offer" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-purple-500/40 transition">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">Powerful AI Tools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-gray-900/50 border-purple-500/30 hover:border-purple-500/60 transition">
                  <CardHeader>
                    <Icon className="w-10 h-10 text-purple-400 mb-2" />
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Simple, Transparent Pricing</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <p className="text-gray-400">Choose the perfect plan for your needs.</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Sparkles className="h-3 w-3" />Save 33% with annual billing — available on all plans
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={`relative ${
                  plan.popular 
                    ? "bg-gradient-to-b from-purple-900/50 to-gray-900/50 border-purple-500 shadow-lg shadow-purple-500/20" 
                    : "bg-gray-900/50 border-purple-500/30"
                } transition hover:border-purple-500`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1 rounded-full text-sm font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="pt-8">
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-purple-400 mt-2">{plan.credits.toLocaleString()} credits included</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-gray-300">
                        <Check className="w-4 h-4 text-purple-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        : "bg-gray-800 hover:bg-gray-700 border border-purple-500/30"
                    }`}
                    asChild
                  >
                    <a href="/subscribe">{plan.cta}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Collapsible 
                key={faq.id}
                open={openFaq === faq.id}
                onOpenChange={(open) => setOpenFaq(open ? faq.id : null)}
              >
                <CollapsibleTrigger className="w-full">
                  <Card className="bg-gray-900/50 border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-left">{faq.question}</CardTitle>
                        <ChevronRight className={`w-5 h-5 text-purple-400 transition ${openFaq === faq.id ? "rotate-90" : ""}`} />
                      </div>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="bg-gray-800/50 border-purple-500/20">
                    <CardContent className="pt-6">
                      <p className="text-gray-300">{faq.answer}</p>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Create?</h2>
          <p className="text-xl text-gray-300 mb-8">Join thousands of creators using WizVid to bring their ideas to life</p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            asChild
          >
            <a href={getLoginUrl()}>Get Started Free</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-900/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/tools/text-to-video" className="hover:text-purple-400">Text-to-Video</a></li>
                <li><a href="/tools/lip-sync" className="hover:text-purple-400">Lip-Sync</a></li>
                <li><a href="/tools/video-to-video" className="hover:text-purple-400">Video-to-Video</a></li>
                <li><a href="/tools/voiceover" className="hover:text-purple-400">Voiceover</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-purple-400">About</a></li>
                <li><a href="#" className="hover:text-purple-400">Blog</a></li>
                <li><a href="#" className="hover:text-purple-400">Careers</a></li>
                <li><a href="#" className="hover:text-purple-400">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-purple-400">Privacy</a></li>
                <li><a href="#" className="hover:text-purple-400">Terms</a></li>
                <li><a href="#" className="hover:text-purple-400">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Follow</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-purple-400">Twitter</a></li>
                <li><a href="#" className="hover:text-purple-400">Discord</a></li>
                <li><a href="#" className="hover:text-purple-400">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-purple-500/20 pt-8 text-center text-gray-400">
            <p>&copy; 2026 WizVid. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
