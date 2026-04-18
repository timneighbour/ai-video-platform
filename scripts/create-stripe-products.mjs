/**
 * create-stripe-products.mjs
 * Creates all WIZ AI products and prices in the Stripe sandbox.
 * Run: node scripts/create-stripe-products.mjs
 */
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = resolve(__dirname, "../.env");
let envContent = "";
try { envContent = readFileSync(envPath, "utf-8"); } catch { /* no .env file */ }

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  if (match) return match[1].trim();
  return process.env[key] || "";
}

const STRIPE_SECRET_KEY = getEnv("STRIPE_SECRET_KEY");
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_")) {
  console.error("❌ STRIPE_SECRET_KEY not found or invalid");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

async function createProduct(name, description) {
  const product = await stripe.products.create({ name, description });
  console.log(`✅ Product: ${name} → ${product.id}`);
  return product.id;
}

async function createPrice(productId, unitAmount, currency, interval, nickname) {
  const params = {
    product: productId,
    unit_amount: unitAmount,
    currency,
    nickname,
  };
  if (interval) {
    params.recurring = { interval };
  }
  const price = await stripe.prices.create(params);
  console.log(`   Price: ${nickname} → ${price.id} (${currency.toUpperCase()} ${(unitAmount / 100).toFixed(2)}${interval ? `/${interval}` : ""})`);
  return price.id;
}

const results = {};

console.log("\n🚀 Creating WIZ AI Stripe products and prices...\n");

try {
  // ── Subscription Plans ──────────────────────────────────────────────────────

  // Starter £9/month
  const starterProd = await createProduct("WIZ AI Starter", "WIZ AI Starter plan — entry-level AI video creation");
  results.STRIPE_STARTER_PRICE_ID = await createPrice(starterProd, 900, "gbp", "month", "Starter Monthly");
  results.STRIPE_STARTER_ANNUAL_PRICE_ID = await createPrice(starterProd, 9000, "gbp", "year", "Starter Annual");

  // Basic £19/month
  const basicProd = await createProduct("WIZ AI Basic", "WIZ AI Basic plan — more videos and features");
  results.STRIPE_BASIC_PRICE_ID = await createPrice(basicProd, 1900, "gbp", "month", "Basic Monthly");
  results.STRIPE_BASIC_ANNUAL_PRICE_ID = await createPrice(basicProd, 19000, "gbp", "year", "Basic Annual");

  // Creator/Pro £39/month
  const proProd = await createProduct("WIZ AI Creator", "WIZ AI Creator plan — most popular, unlimited videos");
  results.STRIPE_PRO_PRICE_ID = await createPrice(proProd, 3900, "gbp", "month", "Creator Monthly");
  results.STRIPE_PRO_ANNUAL_PRICE_ID = await createPrice(proProd, 39000, "gbp", "year", "Creator Annual");

  // Pro+ £59/month
  const proPlusProd = await createProduct("WIZ AI Pro+", "WIZ AI Pro+ plan — priority processing, premium styles");
  results.STRIPE_PRO_PLUS_PRICE_ID = await createPrice(proPlusProd, 5900, "gbp", "month", "Pro+ Monthly");
  results.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID = await createPrice(proPlusProd, 59000, "gbp", "year", "Pro+ Annual");

  // Studio/Business £99/month
  const businessProd = await createProduct("WIZ AI Studio", "WIZ AI Studio plan — enterprise, API access, white-label");
  results.STRIPE_BUSINESS_PRICE_ID = await createPrice(businessProd, 9900, "gbp", "month", "Studio Monthly");
  results.STRIPE_BUSINESS_ANNUAL_PRICE_ID = await createPrice(businessProd, 99000, "gbp", "year", "Studio Annual");

  // ── Credit Packs ────────────────────────────────────────────────────────────

  const creditsProd = await createProduct("WIZ AI Credits", "WIZ AI credit packs for video generation");

  results.STRIPE_SMALL_PACK_PRICE_ID = await createPrice(creditsProd, 999, "gbp", null, "Small Pack (100 credits)");
  results.STRIPE_MEDIUM_PACK_PRICE_ID = await createPrice(creditsProd, 1999, "gbp", null, "Medium Pack (250 credits)");
  results.STRIPE_LARGE_PACK_PRICE_ID = await createPrice(creditsProd, 4999, "gbp", null, "Large Pack (700 credits)");

  // ── Render Paywall Prices ───────────────────────────────────────────────────

  const renderProd = await createProduct("WIZ AI Render", "WIZ AI per-video render payments");

  results.STRIPE_RENDER_STANDARD_PRICE_ID = await createPrice(renderProd, 200, "gbp", null, "Standard Render (£2)");
  results.STRIPE_RENDER_HD_PRICE_ID = await createPrice(renderProd, 400, "gbp", null, "HD Render (£4)");
  results.STRIPE_RENDER_4K_PRICE_ID = await createPrice(renderProd, 600, "gbp", null, "4K Render (£6)");

  // ── Audio Enhancement ───────────────────────────────────────────────────────

  const audioProd = await createProduct("WIZ AI Audio Enhancement", "WIZ AI audio enhancement add-ons");

  results.STRIPE_AUDIO_ENHANCED_PRICE_ID = await createPrice(audioProd, 100, "gbp", null, "Enhanced Audio (£1)");
  results.STRIPE_AUDIO_CINEMATIC_PRICE_ID = await createPrice(audioProd, 300, "gbp", null, "Cinematic Audio (£3)");

  // ── Cinematic Scene Bundles ─────────────────────────────────────────────────

  const cinematicProd = await createProduct("WIZ AI Cinematic Scenes", "WIZ AI cinematic scene upgrade bundles");

  results.STRIPE_CINEMATIC_10_PRICE_ID = await createPrice(cinematicProd, 500, "gbp", null, "Cinematic 10 scenes (£5)");
  results.STRIPE_CINEMATIC_25_PRICE_ID = await createPrice(cinematicProd, 1000, "gbp", null, "Cinematic 25 scenes (£10)");
  results.STRIPE_CINEMATIC_50_PRICE_ID = await createPrice(cinematicProd, 1800, "gbp", null, "Cinematic 50 scenes (£18)");

  // ── Render Bundles ──────────────────────────────────────────────────────────

  const bundleProd = await createProduct("WIZ AI Render Bundles", "WIZ AI pre-paid render bundles");

  results.STRIPE_BUNDLE_6_PRICE_ID = await createPrice(bundleProd, 1000, "gbp", null, "Bundle 6 renders (£10)");
  results.STRIPE_BUNDLE_15_PRICE_ID = await createPrice(bundleProd, 2000, "gbp", null, "Bundle 15 renders (£20)");
  results.STRIPE_BUNDLE_40_PRICE_ID = await createPrice(bundleProd, 5000, "gbp", null, "Bundle 40 renders (£50)");

  console.log("\n✅ All products and prices created successfully!\n");
  console.log("📋 Price IDs to set as environment variables:");
  console.log("─".repeat(60));
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}=${value}`);
  }

  // Write results to a file for reference
  const outputPath = resolve(__dirname, "../stripe-price-ids.txt");
  const output = Object.entries(results).map(([k, v]) => `${k}=${v}`).join("\n");
  writeFileSync(outputPath, output);
  console.log(`\n📄 Price IDs saved to: ${outputPath}`);

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
