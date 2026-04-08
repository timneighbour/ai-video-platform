import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    credits: 1000,
    description: "Perfect for getting started",
    features: ["1,000 credits/month", "Standard quality", "Watermark-free", "Priority queue"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    credits: 3000,
    description: "For professional creators",
    features: ["3,000 credits/month", "4K upscaling", "Commercial license", "Early access"],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 149,
    credits: 10000,
    description: "For teams and studios",
    features: ["10,000 credits/month", "API access", "Team collaboration", "Dedicated support"],
  },
];

export default function Subscribe() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const response = await fetch("/api/trpc/billing.createSubscriptionCheckout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          origin: window.location.origin,
        }),
      });

      const data = await response.json();
      if (data.result?.data) {
        window.open(data.result.data, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Synthora - Choose Your Plan</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Upgrade your subscription to unlock more features and credits
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <Card
                  key={plan.id}
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.credits.toLocaleString()} credits included
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full mb-6"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id ? "Processing..." : "Subscribe Now"}
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

            <div className="mt-12 rounded-lg border border-border/40 bg-secondary/5 p-6">
              <h3 className="font-semibold text-foreground mb-2">Need help choosing?</h3>
              <p className="text-sm text-muted-foreground">
                All plans include access to all AI tools. The main difference is the number of monthly credits and additional features. You can upgrade or downgrade at any time.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
