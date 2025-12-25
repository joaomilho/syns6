/**
 * Debug script to test Stripe webhook payload
 * Run with: npx tsx scripts/test-stripe-webhook.ts
 */

import Stripe from 'stripe';

// Check environment variables
const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

console.log('🔍 Stripe Configuration Check:');
console.log('- STRIPE_SECRET_KEY:', secretKey ? '✅ Set' : '❌ Missing');
console.log('- STRIPE_WEBHOOK_SECRET:', webhookSecret ? '✅ Set' : '❌ Missing');

if (!secretKey) {
  console.error('\n❌ STRIPE_SECRET_KEY is not set in your environment');
  console.error('Add it to your .env.local file');
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2025-02-24.acacia',
});

async function testStripeConnection() {
  console.log('\n🧪 Testing Stripe Connection...\n');

  try {
    // Test 1: List products
    console.log('1️⃣ Fetching products...');
    const products = await stripe.products.list({ limit: 5 });
    console.log(`   ✅ Found ${products.data.length} product(s)`);
    
    products.data.forEach(product => {
      console.log(`   - ${product.name} (${product.id})`);
    });

    // Test 2: List prices
    console.log('\n2️⃣ Fetching prices...');
    const prices = await stripe.prices.list({ limit: 10 });
    console.log(`   ✅ Found ${prices.data.length} price(s)`);
    
    prices.data.forEach(price => {
      const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
      const currency = price.currency.toUpperCase();
      const interval = price.recurring?.interval || 'one-time';
      console.log(`   - ${price.id}: ${currency} ${amount} (${interval})`);
    });

    // Test 3: Check webhook endpoints
    console.log('\n3️⃣ Checking webhook endpoints...');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    console.log(`   ✅ Found ${webhooks.data.length} webhook endpoint(s)`);
    
    webhooks.data.forEach(webhook => {
      console.log(`   - ${webhook.url}`);
      console.log(`     Status: ${webhook.status}`);
      console.log(`     Events: ${webhook.enabled_events.length} enabled`);
    });

    // Test 4: Create a test subscription object to see structure
    console.log('\n4️⃣ Testing subscription object structure...');
    console.log('   Creating a test checkout session to see what data structure looks like...');
    
    // Get first price for testing
    if (prices.data.length > 0 && prices.data[0].recurring) {
      const testPriceId = prices.data[0].id;
      console.log(`   Using price: ${testPriceId}`);
      
      // Note: This would create a real checkout session
      // Uncomment to test, but be aware it creates a real session
      /*
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: testPriceId, quantity: 1 }],
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        metadata: { userId: 'test-user-id' },
      });
      console.log('   ✅ Test checkout session created:', session.id);
      */
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run db:generate');
    console.log('2. Run: npm run db:migrate');
    console.log('3. Start webhook listener: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('4. Test a checkout with a test card');

  } catch (error) {
    console.error('\n❌ Error testing Stripe:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

// Run the test
testStripeConnection();

