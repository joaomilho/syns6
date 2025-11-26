'use client';

import { useState } from 'react';
import styles from './SubscriptionButton.module.css';


interface SubscriptionButtonProps {
  priceId: string;
  planName: string;
  primary: {
    price: string;
    interval: 'week' | 'month' | 'year';
    currency: string;
  };
  secondary?: {
    price: string;
    interval: 'week' | 'month' | 'year';
    currency: string;
  };
  features?: string[];
  disabled?: boolean;
}

export default function SubscriptionButton({
  priceId,
  planName,
  primary,
  secondary,
  disabled = false,
}: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (disabled) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId,
          currency: primary.currency.toLowerCase(), // Stripe expects lowercase currency codes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
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
    <div className={styles.subscriptionCard}>
      <div className={styles.planHeader}>
        <h3 className={styles.planName}>{planName}</h3>
        
        {secondary && (
            <>
            
          <div className={styles.priceContainer}>
          <span style={{ fontSize: '1.5rem' }}>{primary.price}</span>
          <span className={styles.interval}>/{primary.interval}</span>

            only
            <span className={styles.price}>{secondary.price}</span>
            <span className={styles.interval}>/{secondary.interval}</span>

            
          </div>
          </>
        )}
        
        {!secondary &&
        <div className={secondary ? styles.secondaryPrice : styles.priceContainer}>
          <span className={styles.price}>{primary.price}</span>
          <span className={styles.interval}>/{primary.interval}</span>
        </div>
}
      </div>

      <button
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={styles.subscribeButton}
      >
        {loading ? 'Processing...' : disabled ? 'Current Plan' : 'Subscribe'}
      </button>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}

