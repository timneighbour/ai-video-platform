import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });

const products = [
  // Per-render quality tiers (one-time payments)
  { name: 'WizVid Standard Render', amount: 200, env: 'STRIPE_RENDER_STANDARD_PRICE_ID', recurring: false },
  { name: 'WizVid HD Render',       amount: 400, env: 'STRIPE_RENDER_HD_PRICE_ID',       recurring: false },
  { name: 'WizVid 4K Render',       amount: 600, env: 'STRIPE_RENDER_4K_PRICE_ID',       recurring: false },
  // Audio add-ons (one-time)
  { name: 'WizVid Enhanced Sound',  amount: 100, env: 'STRIPE_ADDON_ENHANCED_SOUND_PRICE_ID', recurring: false },
  { name: 'WizVid Cinematic Audio', amount: 300, env: 'STRIPE_ADDON_CINEMATIC_AUDIO_PRICE_ID', recurring: false },
  // Render bundles (one-time)
  { name: 'WizVid Render Bundle 6',  amount: 1000, env: 'STRIPE_BUNDLE_6_PRICE_ID',  recurring: false },
  { name: 'WizVid Render Bundle 15', amount: 2000, env: 'STRIPE_BUNDLE_15_PRICE_ID', recurring: false },
  { name: 'WizVid Render Bundle 40', amount: 5000, env: 'STRIPE_BUNDLE_40_PRICE_ID', recurring: false },
];

console.log('Creating render paywall products in Stripe test mode...\n');

const results = [];

for (const p of products) {
  try {
    const product = await stripe.products.create({ name: p.name });
    const priceParams = {
      product: product.id,
      unit_amount: p.amount,
      currency: 'gbp',
    };
    const price = await stripe.prices.create(priceParams);
    console.log(`✓ ${p.name} → ${price.id}`);
    results.push({ env: p.env, priceId: price.id });
  } catch (err) {
    console.error(`✗ ${p.name}:`, err.message);
  }
}

console.log('\n--- ENV VARS ---');
for (const r of results) {
  console.log(`${r.env}=${r.priceId}`);
}
console.log('----------------\n');
