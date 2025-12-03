'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import CurrencyDropdown, { CurrencyCode } from '@/components/CurrencyDropdown';
import { H1, Button, Logo } from '@/components/ds';
import Link from 'next/link';
import { prices, formatPrice } from '@/lib/prices';
import styles from './pricing.module.css';

// Country code to currency mapping
const countryToCurrency: Record<string, CurrencyCode> = {
  'AE': 'AED', 'AR': 'ARS', 'AU': 'AUD', 'BR': 'BRL', 'CA': 'CAD', 'CH': 'CHF',
  'CL': 'CLP', 'CN': 'CNY', 'DK': 'DKK',
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('IP API failed');
    
    const data = await response.json();
    const currency = countryToCurrency[data.country_code];
    
    if (currency) return currency;
    return null;
  } catch (error) {
    return null;
  }
}

// Detect currency from browser locale
function detectCurrencyFromLocale(): CurrencyCode {
  if (typeof navigator === 'undefined') return 'EUR';
  
  const locale = navigator.language;
  
  if (localeToCurrency[locale]) return localeToCurrency[locale];
  
  const lang = locale.split('-')[0];
  if (localeToCurrency[lang]) return localeToCurrency[lang];
  
  return 'EUR';
}

// Get initial currency with fallback chain
function getInitialCurrencySync(): CurrencyCode {
  if (typeof window === 'undefined') return 'EUR';
  
  try {
    const saved = localStorage.getItem('preferredCurrency');
    if (saved && saved in prices) return saved as CurrencyCode;
  } catch (error) {
    // localStorage not available
  }
  
  return detectCurrencyFromLocale();
}

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyCode>(() => getInitialCurrencySync());

  // Try IP geolocation on mount
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const saved = localStorage.getItem('preferredCurrency');
        if (saved && saved in prices) return;
      } catch (error) {
        // localStorage not available
      }

      const ipCurrency = await detectCurrencyFromIP();
      if (ipCurrency) setCurrency(ipCurrency);
    };

    detectCurrency();
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    try {
      localStorage.setItem('preferredCurrency', newCurrency);
    } catch (error) {
      // localStorage not available
    }
  };

  const handleSignUp = () => {
    if (status === 'authenticated') {
      router.push('/subscribe');
    } else {
      signIn('spotify', { callbackUrl: '/subscribe' });
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const currentPrices = prices[currency];

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <Logo />
        
        <div className={styles.controlGroups}>
          <CurrencyDropdown value={currency} onChange={handleCurrencyChange} />
        </div>
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <H1>Simple, transparent pricing</H1>
          <p className={styles.subtitle}>
            Start with a 3 day free trial. No Credit Card needed. Cancel anytime.
          </p>
        </header>

        <div className={styles.pricingContainer}>
          <div className={styles.planOptions}>
            {/* Weekly Option */}
            <div className={styles.planWrapper}>
              <div className={styles.planOptionDisplay}>
                <div className={styles.planContent}>
                  <span className={styles.planName}>Weekly</span>
                  <span className={styles.planPrice}>
                    {formatPrice(currentPrices.weekly, currency)}
                    <span className={styles.planInterval}>/week</span>
                  </span>
                </div>
              </div>
              <p className={styles.planMessage}>
                Perfect for your weekend party.
              </p>
            </div>

            {/* Monthly Option */}
            <div className={styles.planWrapper}>
              <div className={styles.planOptionDisplay}>
                <div className={styles.planContent}>
                  <span className={styles.planName}>Monthly</span>
                  <span className={styles.planPrice}>
                    {formatPrice(currentPrices.monthly, currency)}
                    <span className={styles.planInterval}>/month</span>
                  </span>
                </div>
              </div>
              <p className={styles.planMessage}>
                Great for regular karaoke nights with friends.
              </p>
            </div>

            {/* Yearly Option */}
            <div className={styles.planWrapper}>
              <div className={styles.planOptionDisplay}>
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
              </div>
              <p className={styles.planMessage}>
                Best value for karaoke enthusiasts.
              </p>
            </div>
          </div>

          <div className={styles.startTrialSection}>
            <Button
              size="cta"
              color="green"
              onClick={handleSignUp}
            >
              {status === 'authenticated' ? 'Choose a plan' : 'Sign up now'}
            </Button>

            <p className={styles.termsNotice}>
              By signing up, you agree to our <Link href="/terms" className={styles.termsLink}>Terms of Service</Link> and <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
