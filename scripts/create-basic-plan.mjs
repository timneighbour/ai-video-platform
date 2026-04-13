/**
 * Creates the £19/month Basic plan product and price in Stripe test mode.
 * Run: node scripts/create-basic-plan.mjs
 */
import Stripe from "stripe";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
try {
  const envPath = join(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
  });
} catch {
  // .env not found, rely on injected env
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function main() {
  console.log("Creating Basic plan in Stripe test mode...");

  // Create the product
  const product = await stripe.products.create({
    name: "WizVid Basic",
    description: "5 renders/month · 1080p HD quality · No watermark",
    metadata: {
      plan: "basic",
      platform: "wizvid",
    },
  });
  console.log("✓ Product created:", product.id);

  // Create the monthly price (£19/month)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1900, // £19.00 in pence
    currency: "gbp",
    recurring: {
      interval: "month",
    },
    nickname: "Basic Monthly",
    metadata: {
      plan: "basic",
      billing: "monthly",
    },
  });
  console.log("✓ Monthly price created:", monthlyPrice.id);

  // Create the annual price (£190/year — save £38)
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 19000, // £190.00 in pence (save £38 vs monthly)
    currency: "gbp",
    recurring: {
      interval: "year",
    },
    nickname: "Basic Annual",
    metadata: {
      plan: "basic",
      billing: "annual",
    },
  });
  console.log("✓ Annual price created:", annualPrice.id);

  console.log("\n=== STRIPE BASIC PLAN CREATED ===");
  console.log(`STRIPE_BASIC_PRICE_ID=${monthlyPrice.id}`);
  console.log(`STRIPE_BASIC_ANNUAL_PRICE_ID=${annualPrice.id}`);
  console.log("\nAdd these to your environment secrets.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
