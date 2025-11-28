"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { getPlanFromPriceId, getPriceForPlan, formatPrice, getCurrencySymbol } from "@/lib/prices";
import { CurrencyCode } from "@/components/CurrencyDropdown";
import { Logo, Button } from "@/components/ds";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { subscription, isActive, loading: subLoading } = useSubscription();
  const [detectedCurrency, setDetectedCurrency] = useState<CurrencyCode>('EUR');

  // Get subscription plan details
  const planInfo = subscription?.stripePriceId 
    ? getPlanFromPriceId(subscription.stripePriceId)
    : null;

  if (status === "loading") {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <h1>Loading...</h1>
        </main>
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <Link href="/player">
          <Logo />
        </Link>
        
        <div className={styles.controlGroups}>
          {session?.user && (
            <div className={styles.userProfile}>
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
            </div>
          )}
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={120}
                height={120}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {session.user.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <div className={styles.info}>
            <h2>{session.user.name || "User"}</h2>
            {session.user.email && (
              <p className={styles.email}>{session.user.email}</p>
            )}
            {session.user.id && (
              <p className={styles.userId}>ID: {session.user.id}</p>
            )}
          </div>
        </div>

         
           {subLoading ? (
             <div className={styles.loadingText}>Loading subscription...</div>
           ) : isActive && subscription ? (
             <SubscriptionStatus 
               planName={planInfo ? `${planInfo.name} Plan` : undefined}
               planPrice={planInfo ? `${formatPrice(
                 getPriceForPlan(planInfo.type, detectedCurrency),
                 detectedCurrency
               )}/${planInfo.interval}` : undefined}
             />
           ) : (
             <div className={styles.noSubscription}>
               <p>You don't have an active subscription.</p>
               <Link href="/pricing" className={styles.subscribeLinkButton}>
                 View Plans
               </Link>
             </div>
           )}
         


        <div className={styles.actions}>
          <Link href="/player">
            <Button color="green" size="medium">
              Open Player
            </Button>
          </Link>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            color="red"
            size="medium"
          >
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}

