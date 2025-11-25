'use client';

import { useEffect, useState } from 'react';
import styles from './SubscriptionStatus.module.css';

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripePriceId: string;
}

interface SubscriptionStatusProps {
  onManageSubscription?: () => void;
}

export default function SubscriptionStatus({ onManageSubscription }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/subscription');
      const data = await response.json();

      if (response.ok) {
        setSubscription(data.subscription);
        setIsActive(data.isActive);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading subscription status...</div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const formattedDate = periodEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>;
      case 'trialing':
        return <span className={`${styles.badge} ${styles.badgeTrialing}`}>Trialing</span>;
      case 'past_due':
        return <span className={`${styles.badge} ${styles.badgePastDue}`}>Past Due</span>;
      case 'canceled':
        return <span className={`${styles.badge} ${styles.badgeCanceled}`}>Canceled</span>;
      default:
        return <span className={styles.badge}>{subscription.status}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Subscription Status</h3>
        {getStatusBadge()}
      </div>

      <div className={styles.details}>
        {isActive ? (
          <>
            <p className={styles.detailText}>
              {subscription.cancelAtPeriodEnd ? (
                <>
                  Your subscription will expire on <strong>{formattedDate}</strong>
                </>
              ) : (
                <>
                  Your subscription renews on <strong>{formattedDate}</strong>
                </>
              )}
            </p>
          </>
        ) : (
          <p className={styles.detailText}>
            Your subscription ended on <strong>{formattedDate}</strong>
          </p>
        )}
      </div>

      <button
        onClick={onManageSubscription || handleManageSubscription}
        disabled={portalLoading}
        className={styles.manageButton}
      >
        {portalLoading ? 'Loading...' : 'Manage Subscription'}
      </button>
    </div>
  );
}

