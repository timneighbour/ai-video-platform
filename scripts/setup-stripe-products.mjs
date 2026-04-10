/**
 * One-time script to create Stripe products and prices for WizVid credit packs.
 * Run: node scripts/setup-stripe-products.mjs
 * Outputs price IDs to be saved as environment variables.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const packs = [
  { key: "STRIPE_SMALL_PACK_PRICE_ID",  name: "WizVid Starter Pack",  credits: 300,  amount: 900,  currency: "gbp" },
  { key: "STRIPE_MEDIUM_PACK_PRICE_ID", name: "WizVid Creator Pack",  credits: 900,  amount: 2400, currency: "gbp" },
  { key: "STRIPE_LARGE_PACK_PRICE_ID",  name: "WizVid Pro Pack",      credits: 2400, amount: 5900, currency: "gbp" },
  { key: "STRIPE_CINEMATIC_10_PRICE_ID",name: "WizVid 10 Cinematic Scenes", credits: 200, amount: 1200, currency: "gbp" },
  { key: "STRIPE_CINEMATIC_25_PRICE_ID",name: "WizVid 25 Cinematic Scenes", credits: 500, amount: 2500, currency: "gbp" },
  { key: "STRIPE_CINEMATIC_50_PRICE_ID",name: "WizVid 50 Cinematic Scenes", credits: 1000, amount: 4500, currency: "gbp" },
];

console.log("Creating Stripe products and prices...\n");

const results = {};

for (const pack of packs) {
  try {
    // Create product
    const product = await stripe.products.create({
      name: pack.name,
      description: `${pack.credits} WizVid credits — never expire`,
      metadata: { credits: pack.credits.toString() },
    });

    // Create one-time price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amount,
      currency: pack.currency,
    });

    results[pack.key] = price.id;
    console.log(`✅ ${pack.name}: ${price.id} (£${(pack.amount / 100).toFixed(2)})`);
  } catch (err) {
    console.error(`❌ Failed to create ${pack.name}:`, err.message);
  }
}

console.log("\n=== Add these to your environment secrets ===");
for (const [key, value] of Object.entries(results)) {
  console.log(`${key}=${value}`);
}
