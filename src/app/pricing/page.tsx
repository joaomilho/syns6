'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionButton from '@/components/SubscriptionButton';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import styles from './pricing.module.css';

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { subscription, isActive, loading: subLoading } = useSubscription();

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Subscribe</h1>
          <p className={styles.subtitle}>
            Unlock premium features and take your music visualization to the next level
          </p>
        </header>

        {isActive && subscription && (
          <SubscriptionStatus />
        )}

<div className={styles.pricingGrid}>
    
          <SubscriptionButton
            priceId={weeklyPriceId}
            planName="Weekly"
            price="€12"
            interval="monthly"
            disabled={currentPriceId === monthlyPriceId}          />

          <SubscriptionButton
            priceId={monthlyPriceId}
            planName="Monthly"
            price="€25"
            interval="monthly"
            disabled={currentPriceId === monthlyPriceId}
          />

          <SubscriptionButton
            priceId={yearlyPriceId}
            planName="Yearly"
            price="€100"
            interval="yearly"
            disabled={currentPriceId === yearlyPriceId}          />
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            All plans include a 3-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

