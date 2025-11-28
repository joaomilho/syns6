'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import CurrencyDropdown, { CurrencyCode } from '@/components/CurrencyDropdown';
import Syns6Logo from '@/components/Syns6Logo';
import { H1, Button } from '@/components/ds';
import Link from 'next/link';
import Image from 'next/image';
import { prices, formatPrice, getCurrencySymbol } from '@/lib/prices';
import styles from './pricing.module.css';

// Country code to currency mapping
const countryToCurrency: Record<string, CurrencyCode> = {
  'AE': 'AED', 'AR': 'ARS', 'AU': 'AUD', 'BR': 'BRL', 'CA': 'CAD', 'CH': 'CHF',
  'CL': 'CLP', 'CN': 'CNY', 'DK': 'DKK',
  // Euro zone countries
  'AT': 'EUR', 'BE': 'EUR', 'CY': 'EUR', 'EE': 'EUR', 'FI': 'EUR', 'FR': 'EUR',
  'DE': 'EUR', 'GR': 'EUR', 'IE': 'EUR', 'IT': 'EUR', 'LV': 'EUR', 'LT': 'EUR',
  'LU': 'EUR', 'MT': 'EUR', 'NL': 'EUR', 'PT': 'EUR', 'SK': 'EUR', 'SI': 'EUR',
  'ES': 'EUR', 'HR': 'EUR',
  'GB': 'GBP', 'HK': 'HKD', 'ID': 'IDR', 'IL': 'ILS', 'IN': 'INR', 'IS': 'ISK',
  'JP': 'JPY', 'KR': 'KRW', 'MX': 'MXN', 'MY': 'MYR', 'NG': 'NGN', 'NO': 'NOK',
  'PK': 'PKR', 'PL': 'PLN', 'RU': 'RUB', 'SE': 'SEK', 'SG': 'SGD', 'TH': 'THB',
  'TR': 'TRY', 'TW': 'TWD', 'UA': 'UAH', 'US': 'USD', 'UY': 'UYU', 'ZA': 'ZAR',
};

// Locale to currency mapping for browser detection
const localeToCurrency: Record<string, CurrencyCode> = {
  'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD', 'en-NZ': 'AUD',
  'de': 'EUR', 'de-DE': 'EUR', 'de-AT': 'EUR', 'de-CH': 'CHF',
  'fr': 'EUR', 'fr-FR': 'EUR', 'fr-CA': 'CAD', 'fr-CH': 'CHF',
  'es': 'EUR', 'es-ES': 'EUR', 'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CL': 'CLP',
  'it': 'EUR', 'it-IT': 'EUR', 'it-CH': 'CHF',
  'nl': 'EUR', 'nl-NL': 'EUR', 'nl-BE': 'EUR',
  'pt': 'EUR', 'pt-PT': 'EUR', 'pt-BR': 'BRL',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'ko': 'KRW', 'ko-KR': 'KRW',
  'zh': 'CNY', 'zh-CN': 'CNY', 'zh-TW': 'TWD', 'zh-HK': 'HKD',
  'ru': 'RUB', 'ru-RU': 'RUB',
  'tr': 'TRY', 'tr-TR': 'TRY',
  'ar': 'AED', 'ar-AE': 'AED',
  'th': 'THB', 'th-TH': 'THB',
  'pl': 'PLN', 'pl-PL': 'PLN',
  'sv': 'SEK', 'sv-SE': 'SEK',
  'no': 'NOK', 'nb': 'NOK', 'nn': 'NOK',
  'da': 'DKK', 'da-DK': 'DKK',
  'he': 'ILS', 'he-IL': 'ILS',
  'hi': 'INR', 'hi-IN': 'INR',
  'id': 'IDR', 'id-ID': 'IDR',
};

// Detect currency from IP geolocation
async function detectCurrencyFromIP(): Promise<CurrencyCode | null> {
  try {
    console.log('🌍 Attempting IP geolocation detection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('IP API failed');
    
    const data = await response.json();
    const currency = countryToCurrency[data.country_code];
    
    if (currency) {
      console.log(`✅ IP detected country: ${data.country_code} → ${currency}`);
      return currency;
    }
    
    console.log(`⚠️ Country ${data.country_code} not mapped to currency`);
    return null;
  } catch (error) {
    console.log('❌ IP geolocation failed:', error);
    return null;
  }
}

// Detect currency from browser locale
function detectCurrencyFromLocale(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'EUR';
  
  const locale = navigator.language;
  console.log(`🗣️ Browser locale detected: ${locale}`);
  
  // Check exact match first (e.g., 'en-US')
  if (localeToCurrency[locale]) {
    console.log(`✅ Locale matched: ${locale} → ${localeToCurrency[locale]}`);
    return localeToCurrency[locale];
  }
  
  // Check language only (e.g., 'en' from 'en-US')
  const lang = locale.split('-')[0];
  if (localeToCurrency[lang]) {
    console.log(`✅ Language matched: ${lang} → ${localeToCurrency[lang]}`);
    return localeToCurrency[lang];
  }
  
  console.log('ℹ️ No locale match, using EUR default');
  return 'EUR';
}

// Get initial currency with fallback chain
function getInitialCurrencySync(): CurrencyCode {
  if (typeof window === 'undefined') return 'EUR';
  
  // 1. Check localStorage (user previously selected)
  try {
    const saved = localStorage.getItem('preferredCurrency');
    if (saved && saved in prices) {
      console.log(`💾 Using saved preference: ${saved}`);
      return saved as CurrencyCode;
    }
  } catch (error) {
    console.log('⚠️ localStorage not available');
  }
  
  // 2. Fallback to locale detection
  return detectCurrencyFromLocale();
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { subscription, isActive, loading: subLoading } = useSubscription();
  const [currency, setCurrency] = useState<CurrencyCode>(() => getInitialCurrencySync());
  const [isDetecting, setIsDetecting] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try IP geolocation on mount (only if user hasn't manually selected)
  useEffect(() => {
    const detectCurrency = async () => {
      // Check if user has manually saved a preference
      try {
        const saved = localStorage.getItem('preferredCurrency');
        if (saved && saved in prices) {
          console.log('✅ User has manually saved preference, skipping IP detection');
          setIsDetecting(false);
          return;
        }
      } catch (error) {
        // localStorage not available
      }

      // Always run IP geolocation if no manual preference
      console.log('🔄 No manual preference found, running IP detection...');
      const ipCurrency = await detectCurrencyFromIP();
      
      if (ipCurrency) {
        console.log(`🎯 Setting currency from IP: ${ipCurrency}`);
        setCurrency(ipCurrency);
        // Don't save to localStorage - only save manual selections
      } else {
        console.log('ℹ️ IP detection failed, using locale-based currency');
        // Already set from getInitialCurrencySync()
      }
      
      setIsDetecting(false);
    };

    detectCurrency();
  }, []);

  // Save to localStorage when user manually changes currency
  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    console.log(`👤 User manually selected: ${newCurrency}`);
    setCurrency(newCurrency);
    try {
      localStorage.setItem('preferredCurrency', newCurrency);
    } catch (error) {
      console.log('⚠️ Could not save to localStorage');
    }
  };

  // If not logged in, redirect to login or show login prompt
  if (status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.loginPrompt}>
          <h1>Please sign in to view pricing</h1>
          <button 
            onClick={() => router.push('/api/auth/signin')}
            className={styles.signInButton}
          >
            Sign In with Spotify
          </button>
        </div>
      </div>
    );
  }

  if (status === 'loading' || subLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const currentPriceId = subscription?.stripePriceId;
  const weeklyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_WEEKLY || '';
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '';
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '';

  const currentPrices = prices[currency];

  const getPriceId = () => {
    switch (selectedPlan) {
      case 'weekly': return weeklyPriceId;
      case 'monthly': return monthlyPriceId;
      case 'yearly': return yearlyPriceId;
    }
  };

  const handleStartTrial = async () => {
    if (isActive) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId: getPriceId(),
          currency: currency.toLowerCase(),
          promoCode: process.env.NEXT_PUBLIC_STRIPE_PROMO_SYNS6HUNT, // Product Hunt promo code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <Syns6Logo />
        
        <div className={styles.controlGroups}>
          <CurrencyDropdown value={currency} onChange={handleCurrencyChange} />
          
          {session?.user && (
            <Link href="/profile" className={styles.userProfile}>
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={36}
                  height={36}
                  className={styles.userAvatar}
                />
              ) : (
                <div className={styles.userAvatarPlaceholder}>
                  {session.user.name?.charAt(0) || "U"}
                </div>
              )}
            </Link>
          )}
        </div>
        </div>

        <div className={styles.content}>
        <header className={styles.header}>
          <H1>Start your free trial</H1>
          <p className={styles.subtitle}>
            Start your 3 day free trial, no Credit Card needed
          </p>
        </header>

        {isActive && subscription && (
          <SubscriptionStatus />
        )}

<div className={styles.pricingContainer}>
          <div className={styles.planOptions}>
            {/* Weekly Option */}
            <div className={styles.planWrapper}>
              <label className={`${styles.planOption} ${selectedPlan === 'weekly' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="plan"
                  value="weekly"
                  checked={selectedPlan === 'weekly'}
                  onChange={() => setSelectedPlan('weekly')}
                  className={styles.radioInput}
                />
                <div className={styles.planContent}>
                  <span className={styles.planName}>Weekly</span>
                  <span className={styles.planPriceStrikethrough}>
                    {formatPrice(currentPrices.weekly, currency)}
                    <span className={styles.planInterval}>/week</span>
                  </span>
                  <span className={styles.freePromo}>FREE</span>
                </div>
              </label>
              <p className={styles.planMessage}>
                Free first week for Product Hunt users. <br />Don't worry, after that your subscription cancels automatically, only pay if you choose to continue.
              </p>
            </div>

            {/* Monthly Option */}
            <div className={styles.planWrapper}>
              <label className={`${styles.planOption} ${selectedPlan === 'monthly' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={selectedPlan === 'monthly'}
                  onChange={() => setSelectedPlan('monthly')}
                  className={styles.radioInput}
                />
                <div className={styles.planContent}>
                  <span className={styles.planName}>Monthly</span>
                  <span className={styles.planPrice}>
                    {formatPrice(currentPrices.monthly, currency)}
                    <span className={styles.planInterval}>/month</span>
                  </span>
                </div>
              </label>
              <p className={styles.planMessage}>
                Don't worry, after that your subscription cancels automatically, only pay if you choose to continue.
              </p>
            </div>

            {/* Yearly Option */}
            <div className={styles.planWrapper}>
              <label className={`${styles.planOption} ${selectedPlan === 'yearly' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="plan"
                  value="yearly"
                  checked={selectedPlan === 'yearly'}
                  onChange={() => setSelectedPlan('yearly')}
                  className={styles.radioInput}
                />
                <div className={styles.planContent}>
                  <span className={styles.planName}>Yearly</span>
                  <div className={styles.yearlyPricing}>
                    <span className={styles.planPrice}>
                      {formatPrice(currentPrices.yearly, currency)}
                      <span className={styles.planInterval}>/year</span>
                    </span>
                    <span className={styles.monthlyEquivalent}>
                      only {formatPrice(currentPrices.yearly/12, currency)}/mo
                    </span>
                  </div>
                </div>
              </label>
              <p className={styles.planMessage}>
                Don't worry, after that your subscription cancels automatically, only pay if you choose to continue.
              </p>
            </div>
          </div>

          <div className={styles.startTrialSection}>
            <Button
              size="cta"
              color="green"
              onClick={handleStartTrial}
              disabled={isActive || loading}
            >
              {loading ? 'Processing...' : isActive ? 'Already Subscribed' : 'Start trial'}
            </Button>
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <p className={styles.termsNotice}>
              By subscribing, you agree to our <Link href="/terms" className={styles.termsLink}>Terms of Service</Link> and <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>.
            </p>
          </div>
        </div>

        
      </div>
    </div>
  );
}

