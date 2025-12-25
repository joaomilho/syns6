import { CurrencyCode } from '@/components/CurrencyDropdown';

export const prices = {
  'AED': { weekly: 50.00, monthly: 100.00, yearly: 400.00 },
  'ARS': { weekly: 20000.00, monthly: 40000.00, yearly: 160000.00 },
  'AUD': { weekly: 22.00, monthly: 45.00, yearly: 180.00 },
  'BRL': { weekly: 75.00, monthly: 150.00, yearly: 600.00 },
  'CAD': { weekly: 20.00, monthly: 40.00, yearly: 160.00 },
  'CHF': { weekly: 11.00, monthly: 25.00, yearly: 100.00 },
  'CLP': { weekly: 13000, monthly: 25000, yearly: 100000 },
  'CNY': { weekly: 100.00, monthly: 200.00, yearly: 800.00 },
  'DKK': { weekly: 90.00, monthly: 190.00, yearly: 750.00 },
  'EUR': { weekly: 12.00, monthly: 25.00, yearly: 100.00 },
  'GBP': { weekly: 11.00, monthly: 22.00, yearly: 90.00 },
  'HKD': { weekly: 110.00, monthly: 225.00, yearly: 900.00 },
  'IDR': { weekly: 250000.00, monthly: 500000.00, yearly: 2000000.00 },
  'ILS': { weekly: 50.00, monthly: 100.00, yearly: 400.00 },
  'INR': { weekly: 1250.00, monthly: 2500.00, yearly: 10000.00 },
  'ISK': { weekly: 1750.00, monthly: 3600.00, yearly: 15000.00 },
  'JPY': { weekly: 2200, monthly: 4500, yearly: 18000 },
  'KRW': { weekly: 20000, monthly: 40000, yearly: 170000 },
  'MXN': { weekly: 250.00, monthly: 500.00, yearly: 2000.00 },
  'MYR': { weekly: 60.00, monthly: 120.00, yearly: 480.00 },
  'NGN': { weekly: 20000.00, monthly: 45000.00, yearly: 180000.00 },
  'NOK': { weekly: 150.00, monthly: 300.00, yearly: 1200.00 },
  'PKR': { weekly: 4000.00, monthly: 8000.00, yearly: 32000.00 },
  'PLN': { weekly: 50.00, monthly: 100.00, yearly: 400.00 },
  'RUB': { weekly: 1000.00, monthly: 2250.00, yearly: 9000.00 },
  'SEK': { weekly: 140.00, monthly: 275.00, yearly: 1100.00 },
  'SGD': { weekly: 20.00, monthly: 40.00, yearly: 150.00 },
  'THB': { weekly: 450.00, monthly: 950.00, yearly: 3750.00 },
  'TRY': { weekly: 600.00, monthly: 1250.00, yearly: 5000.00 },
  'TWD': { weekly: 450.00, monthly: 900.00, yearly: 3600.00 },
  'UAH': { weekly: 600.00, monthly: 1200.00, yearly: 4800.00 },
  'USD': { weekly: 15.00, monthly: 30.00, yearly: 120.00 },
  'UYU': { weekly: 550.00, monthly: 1150.00, yearly: 4600.00 },
  'ZAR': { weekly: 250.00, monthly: 500.00, yearly: 2000.00 },
};

// Currency symbols mapping
const currencySymbols: Record<CurrencyCode, string> = {
  'AED': 'د.إ', 'ARS': '$', 'AUD': '$', 'BRL': 'R$', 'CAD': '$', 'CHF': 'CHF',
  'CLP': '$', 'CNY': '¥', 'DKK': 'kr', 'EUR': '€', 'GBP': '£', 'HKD': '$', 
  'IDR': 'Rp', 'ILS': '₪', 'INR': '₹', 'ISK': 'kr', 'JPY': '¥', 'KRW': '₩', 
  'MXN': '$', 'MYR': 'RM', 'NGN': '₦', 'NOK': 'kr', 'PKR': '₨', 'PLN': 'zł', 
  'RUB': 'р.', 'SEK': 'kr', 'SGD': '$', 'THB': '฿', 'TRY': 'TL', 'TWD': '$', 
  'UAH': '₴', 'USD': '$', 'UYU': '$', 'ZAR': 'R'
};

export function getCurrencySymbol(code: CurrencyCode): string {
  return currencySymbols[code] || '$';
}

export function formatPrice(amount: number, code: CurrencyCode): string {
  const symbol = getCurrencySymbol(code);
  // No decimals
  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// Price ID to plan mapping
export interface PlanInfo {
  name: 'Weekly' | 'Monthly' | 'Yearly';
  interval: 'week' | 'month' | 'year';
  type: 'weekly' | 'monthly' | 'yearly';
}

// Map your actual Stripe price IDs to plan types
// You'll need to update these with your actual price IDs from environment variables
export function getPlanFromPriceId(priceId: string): PlanInfo | null {
  // Check against environment variables
  const weeklyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_WEEKLY;
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

  if (priceId === weeklyPriceId) {
    return { name: 'Weekly', interval: 'week', type: 'weekly' };
  } else if (priceId === monthlyPriceId) {
    return { name: 'Monthly', interval: 'month', type: 'monthly' };
  } else if (priceId === yearlyPriceId) {
    return { name: 'Yearly', interval: 'year', type: 'yearly' };
  }
  
  return null;
}

// Get price for a specific plan and currency
export function getPriceForPlan(
  planType: 'weekly' | 'monthly' | 'yearly',
  currency: CurrencyCode
): number {
  return prices[currency][planType];
}

