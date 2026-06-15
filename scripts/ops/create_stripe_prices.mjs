/**
 * Creates all WIZ AI products and prices in the Stripe sandbox account.
 * Run with: node /home/ubuntu/create_stripe_prices.mjs
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });

async function createPrice(productName, amount, currency, interval, metadata = {}) {
  // Create product
  const product = await stripe.products.create({
    name: productName,
    metadata,
  });
  
  let priceParams = {
    product: product.id,
    currency,
    unit_amount: amount, // in pence
    metadata,
  };
  
  if (interval) {
    priceParams.recurring = { interval };
  }
  
  const price = await stripe.prices.create(priceParams);
  return { product: product.id, price: price.id, name: productName };
}

async function main() {
  console.log('Creating WIZ AI Stripe products and prices...\n');
  
  const results = {};
  
  // ── Subscription Plans ──────────────────────────────────────────────────────
  
  // Starter Plan — £9/mo
  let r = await createPrice('WIZ AI Starter Plan', 900, 'gbp', 'month', { plan: 'starter' });
  results.STRIPE_STARTER_PRICE_ID = r.price;
  console.log('✓ Starter monthly:', r.price);
  
  // Starter Annual — £86.40/yr (£7.20/mo, 20% off)
  r = await createPrice('WIZ AI Starter Plan (Annual)', 8640, 'gbp', 'year', { plan: 'starter', billing: 'annual' });
  results.STRIPE_STARTER_ANNUAL_PRICE_ID = r.price;
  console.log('✓ Starter annual:', r.price);

  // Creator / Pro Plan — £35/mo
  r = await createPrice('WIZ AI Creator Plan', 3500, 'gbp', 'month', { plan: 'creator' });
  results.STRIPE_PRO_PRICE_ID = r.price;
  console.log('✓ Creator monthly:', r.price);
  
  // Creator Annual — £336/yr (£28/mo, 20% off)
  r = await createPrice('WIZ AI Creator Plan (Annual)', 33600, 'gbp', 'year', { plan: 'creator', billing: 'annual' });
  results.STRIPE_PRO_ANNUAL_PRICE_ID = r.price;
  console.log('✓ Creator annual:', r.price);

  // Studio / Pro Plus Plan — £99/mo
  r = await createPrice('WIZ AI Studio Plan', 9900, 'gbp', 'month', { plan: 'studio' });
  results.STRIPE_PRO_PLUS_PRICE_ID = r.price;
  console.log('✓ Studio monthly:', r.price);
  
  // Studio Annual — £950.40/yr (£79.20/mo, 20% off)
  r = await createPrice('WIZ AI Studio Plan (Annual)', 95040, 'gbp', 'year', { plan: 'studio', billing: 'annual' });
  results.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID = r.price;
  console.log('✓ Studio annual:', r.price);

  // Basic Plan (legacy alias for Starter) — £9/mo
  r = await createPrice('WIZ AI Basic Plan', 900, 'gbp', 'month', { plan: 'basic' });
  results.STRIPE_BASIC_PRICE_ID = r.price;
  console.log('✓ Basic monthly:', r.price);
  
  // Basic Annual
  r = await createPrice('WIZ AI Basic Plan (Annual)', 8640, 'gbp', 'year', { plan: 'basic', billing: 'annual' });
  results.STRIPE_BASIC_ANNUAL_PRICE_ID = r.price;
  console.log('✓ Basic annual:', r.price);

  // Business Plan — £149/mo
  r = await createPrice('WIZ AI Business Plan', 14900, 'gbp', 'month', { plan: 'business' });
  results.STRIPE_BUSINESS_PRICE_ID = r.price;
  console.log('✓ Business monthly:', r.price);

  // ── Build Credit Packs (one-time) ────────────────────────────────────────────
  
  // Quick Boost — £12 (3 credits)
  r = await createPrice('WIZ AI Quick Boost — 3 Build Credits', 1200, 'gbp', null, { pack: 'quick_boost', credits: '3' });
  results.STRIPE_TOPUP_QUICK_BOOST_PRICE_ID = r.price;
  console.log('✓ Quick Boost £12:', r.price);
  
  // Creator Boost — £35 (10 credits)
  r = await createPrice('WIZ AI Creator Boost — 10 Build Credits', 3500, 'gbp', null, { pack: 'creator_boost', credits: '10' });
  results.STRIPE_TOPUP_CREATOR_BOOST_PRICE_ID = r.price;
  console.log('✓ Creator Boost £35:', r.price);
  
  // Studio Boost — £89 (25 credits)
  r = await createPrice('WIZ AI Studio Boost — 25 Build Credits', 8900, 'gbp', null, { pack: 'studio_boost', credits: '25' });
  results.STRIPE_TOPUP_STUDIO_BOOST_PRICE_ID = r.price;
  console.log('✓ Studio Boost £89:', r.price);
  
  // Pro Bulk Boost — £199 (60 credits)
  r = await createPrice('WIZ AI Pro Bulk Boost — 60 Build Credits', 19900, 'gbp', null, { pack: 'pro_bulk_boost', credits: '60' });
  results.STRIPE_TOPUP_PRO_BULK_BOOST_PRICE_ID = r.price;
  console.log('✓ Pro Bulk Boost £199:', r.price);

  // ── Legacy Credit Packs ──────────────────────────────────────────────────────
  
  // Small Pack (legacy)
  r = await createPrice('WIZ AI Small Credit Pack', 1200, 'gbp', null, { pack: 'small' });
  results.STRIPE_SMALL_PACK_PRICE_ID = r.price;
  console.log('✓ Small Pack:', r.price);
  
  // Medium Pack (legacy)
  r = await createPrice('WIZ AI Medium Credit Pack', 3500, 'gbp', null, { pack: 'medium' });
  results.STRIPE_MEDIUM_PACK_PRICE_ID = r.price;
  console.log('✓ Medium Pack:', r.price);
  
  // Large Pack (legacy)
  r = await createPrice('WIZ AI Large Credit Pack', 8900, 'gbp', null, { pack: 'large' });
  results.STRIPE_LARGE_PACK_PRICE_ID = r.price;
  console.log('✓ Large Pack:', r.price);

  // ── Bundle Packs ─────────────────────────────────────────────────────────────
  
  // Bundle 6
  r = await createPrice('WIZ AI Bundle 6 Credits', 1200, 'gbp', null, { pack: 'bundle_6' });
  results.STRIPE_BUNDLE_6_PRICE_ID = r.price;
  console.log('✓ Bundle 6:', r.price);
  
  // Bundle 15
  r = await createPrice('WIZ AI Bundle 15 Credits', 3500, 'gbp', null, { pack: 'bundle_15' });
  results.STRIPE_BUNDLE_15_PRICE_ID = r.price;
  console.log('✓ Bundle 15:', r.price);
  
  // Bundle 40
  r = await createPrice('WIZ AI Bundle 40 Credits', 8900, 'gbp', null, { pack: 'bundle_40' });
  results.STRIPE_BUNDLE_40_PRICE_ID = r.price;
  console.log('✓ Bundle 40:', r.price);

  // ── Pay-Per-Video Render Prices ───────────────────────────────────────────────
  
  // Standard 720p — £2
  r = await createPrice('WIZ AI Standard Render (720p)', 200, 'gbp', null, { render: 'standard', quality: '720p' });
  results.STRIPE_RENDER_STANDARD_PRICE_ID = r.price;
  console.log('✓ Render Standard £2:', r.price);
  
  // HD 1080p — £4
  r = await createPrice('WIZ AI HD Render (1080p)', 400, 'gbp', null, { render: 'hd', quality: '1080p' });
  results.STRIPE_RENDER_HD_PRICE_ID = r.price;
  console.log('✓ Render HD £4:', r.price);
  
  // 4K 2160p — £6
  r = await createPrice('WIZ AI 4K Render (2160p)', 600, 'gbp', null, { render: '4k', quality: '2160p' });
  results.STRIPE_RENDER_4K_PRICE_ID = r.price;
  console.log('✓ Render 4K £6:', r.price);

  // ── WizSound Audio Tiers ──────────────────────────────────────────────────────
  
  // WizSound Enhanced — £1 add-on
  r = await createPrice('WizSound Enhanced Audio', 100, 'gbp', null, { audio: 'enhanced' });
  results.STRIPE_AUDIO_ENHANCED_PRICE_ID = r.price;
  console.log('✓ Audio Enhanced £1:', r.price);
  
  // WizSound Cinematic — £3 add-on
  r = await createPrice('WizSound Spatial/Cinematic Audio', 300, 'gbp', null, { audio: 'cinematic' });
  results.STRIPE_AUDIO_CINEMATIC_PRICE_ID = r.price;
  console.log('✓ Audio Cinematic £3:', r.price);

  // ── Cinematic Credit Packs ────────────────────────────────────────────────────
  
  // Cinematic 10
  r = await createPrice('WIZ AI Cinematic Pack 10', 1000, 'gbp', null, { pack: 'cinematic_10' });
  results.STRIPE_CINEMATIC_10_PRICE_ID = r.price;
  console.log('✓ Cinematic 10:', r.price);
  
  // Cinematic 25
  r = await createPrice('WIZ AI Cinematic Pack 25', 2500, 'gbp', null, { pack: 'cinematic_25' });
  results.STRIPE_CINEMATIC_25_PRICE_ID = r.price;
  console.log('✓ Cinematic 25:', r.price);
  
  // Cinematic 50
  r = await createPrice('WIZ AI Cinematic Pack 50', 5000, 'gbp', null, { pack: 'cinematic_50' });
  results.STRIPE_CINEMATIC_50_PRICE_ID = r.price;
  console.log('✓ Cinematic 50:', r.price);

  // ── Output ────────────────────────────────────────────────────────────────────
  
  console.log('\n\n=== NEW PRICE IDs (copy to webdev_request_secrets) ===\n');
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}=${value}`);
  }
  
  console.log('\n=== JSON for secrets update ===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
