#!/bin/bash

# Stripe Integration Setup Script
# This script will guide you through setting up Stripe subscriptions

set -e

echo "🚀 Stripe Integration Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo "Creating from template..."
    cp env.template .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your Stripe keys${NC}"
    exit 1
fi

# Check if Stripe keys are set
if ! grep -q "STRIPE_SECRET_KEY=\"sk_" .env.local; then
    echo -e "${YELLOW}⚠️  STRIPE_SECRET_KEY not configured in .env.local${NC}"
    echo "Please add your Stripe keys and run this script again"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Generate Prisma client
echo "🔧 Step 2: Generating Prisma client..."
npm run db:generate
echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

# Step 3: Run migrations
echo "🗄️  Step 3: Running database migrations..."
echo "This will create the subscription tables..."
npm run db:migrate
echo -e "${GREEN}✅ Database migrated${NC}"
echo ""

# Step 4: Test Stripe connection
echo "🧪 Step 4: Testing Stripe connection..."
npx tsx scripts/test-stripe-webhook.ts
echo ""

# Step 5: Instructions for webhook
echo "================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start your dev server:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. In a NEW terminal, start Stripe webhook listener:"
echo "   ${YELLOW}stripe listen --forward-to localhost:3000/api/stripe/webhook${NC}"
echo ""
echo "3. Copy the webhook signing secret (whsec_...) and add to .env.local:"
echo "   ${YELLOW}STRIPE_WEBHOOK_SECRET=\"whsec_...\"${NC}"
echo ""
echo "4. Restart your dev server"
echo ""
echo "5. Test it out:"
echo "   Visit: ${YELLOW}http://localhost:3000/pricing${NC}"
echo "   Test card: ${YELLOW}4242 4242 4242 4242${NC}"
echo ""
echo "================================"
echo ""
echo "📚 Documentation:"
echo "- STRIPE_QUICK_START.md - Quick setup guide"
echo "- STRIPE_SETUP.md - Detailed configuration"
echo "- STRIPE_TROUBLESHOOTING.md - Common issues"
echo ""

