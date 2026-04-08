import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const CREDIT_PACKS = [
  {
    id: "small",
    name: "Small",
    price: 10,
    credits: 500,
    costPerCredit: "$0.020",
    description: "Great for trying out",
  },
  {
    id: "medium",
    name: "Medium",
    price: 25,
    credits: 1500,
    costPerCredit: "$0.017",
    description: "Best value",
    popular: true,
  },
  {
    id: "large",
    name: "Large",
    price: 60,
    credits: 4000,
    costPerCredit: "$0.015",
    description: "Maximum savings",
  },
];

export default function Credits() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleCheckout = async (packId: string) => {
    setLoading(packId);
    try {
      const response = await fetch("/api/trpc/billing.createCreditCheckout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId,
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
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Synthora - Buy Credits</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Purchase Additional Credits
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Never run out of credits. Buy now and use them anytime.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {CREDIT_PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`relative border-border/40 bg-card/50 backdrop-blur transition-all ${
                    pack.popular ? "ring-2 ring-accent" : ""
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                        <Zap className="h-3 w-3" />
                        Best Value
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{pack.name} Pack</CardTitle>
                    <CardDescription>{pack.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">${pack.price}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {pack.credits.toLocaleString()} credits
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pack.costPerCredit} per credit
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant={pack.popular ? "default" : "outline"}
                      onClick={() => handleCheckout(pack.id)}
                      disabled={loading === pack.id}
                    >
                      {loading === pack.id ? "Processing..." : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Card className="border-border/40 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">No Expiration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Credits purchased through packs never expire. Use them whenever you want.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg">Instant Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your credits are added immediately after purchase. Start creating right away.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
