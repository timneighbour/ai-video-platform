import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Sparkles, Zap, Video, Mic, Wand2, Check, HelpCircle } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/Synthora_999ed4b0.png" alt="Synthora" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" asChild>
                  <a href="/dashboard">Dashboard</a>
                </Button>
                <Button variant="default">
                  <a href="/account">Account</a>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
                <Button variant="default" asChild>
                  <a href={getLoginUrl()}>Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-background to-secondary/5 py-24 sm:py-32 lg:py-40">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Powered by cutting-edge AI</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Create stunning videos with AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Synthora transforms your creative vision into reality. Generate cinematic videos, create talking avatars, and produce professional content in minutes, not hours.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                  Start Creating
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#pricing">View Pricing</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border/40 py-20 sm:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Powerful AI Tools at Your Fingertips
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to create professional-quality videos
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/40 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-b border-border/40 py-20 sm:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the perfect plan for your creative needs
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border-border/40 bg-card/50 backdrop-blur transition-all ${
                  plan.popular ? "ring-2 ring-accent lg:scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.credits.toLocaleString()} credits included</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full mb-6" variant={plan.popular ? "default" : "outline"} asChild>
                    <a href={isAuthenticated ? "/subscribe" : getLoginUrl()}>
                      {plan.cta}
                    </a>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-accent" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Packs Section */}
      <section className="border-b border-border/40 py-20 sm:py-28 bg-secondary/5">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Need More Credits?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purchase additional credit packs anytime to keep creating
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            {[
              { name: "Small", price: 10, credits: 500 },
              { name: "Medium", price: 25, credits: 1500 },
              { name: "Large", price: 60, credits: 4000 },
            ].map((pack) => (
              <Card key={pack.name} className="border-border/40 bg-card/50 backdrop-blur text-center">
                <CardHeader>
                  <CardTitle>{pack.name} Pack</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">${pack.price}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{pack.credits.toLocaleString()} credits</p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline" asChild>
                    <a href={isAuthenticated ? "/credits" : getLoginUrl()}>
                      Buy Now
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-b border-border/40 py-20 sm:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to know about Visionary
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <Collapsible
                  key={faq.id}
                  open={openFaq === faq.id}
                  onOpenChange={(open) => setOpenFaq(open ? faq.id : null)}
                >
                  <Card className="border-border/40 bg-card/50 backdrop-blur">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between p-6 text-left hover:bg-secondary/20 transition-colors">
                        <span className="font-semibold text-foreground">{faq.question}</span>
                        <HelpCircle className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/40 px-6 py-4">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border/40 py-20 sm:py-28 bg-accent/5">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to create amazing videos?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of creators using Visionary to bring their ideas to life
            </p>
            <Button size="lg" className="mt-8 gap-2" asChild>
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                Start Free Today
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-secondary/5 py-12 sm:py-16">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                    <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/Synthora_999ed4b0.png" alt="Synthora" className="h-8" />
              </div>
              <p className="text-sm text-muted-foreground">Create stunning videos with AI</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8">
              <p className="text-center text-sm text-muted-foreground">
              © 2026 Synthora. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
