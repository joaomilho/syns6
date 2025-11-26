"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import Syns6Logo from "@/components/Syns6Logo";
import { getReferralUrl, getSocialShareUrls, shareNative } from "@/lib/referral";

export default function WaitlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [supportsWebShare, setSupportsWebShare] = useState(false);

  useEffect(() => {
    // If not logged in, redirect to home
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Check for referral code in localStorage and track it
  useEffect(() => {
    if (session?.user) {
      const storedReferralCode = localStorage.getItem('referralCode');
      if (storedReferralCode) {
        // Track the referral
        fetch("/api/referral/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: storedReferralCode }),
        })
          .then(() => {
            // Clear the stored referral code after tracking
            localStorage.removeItem('referralCode');
          })
          .catch((err) => console.error("Failed to track referral:", err));
      }
    }
  }, [session]);

  // Fetch or generate referral code
  useEffect(() => {
    if (session?.user) {
      fetch("/api/referral/ensure", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.referralCode) {
            setReferralCode(data.referralCode);
            setReferralCount(data.referralCount || 0);
          }
        })
        .catch((err) => console.error("Failed to get referral code:", err));
    }
  }, [session]);

  const handleCopy = () => {
    if (referralCode) {
      const url = getReferralUrl(referralCode);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (referralCode) {
      const url = getReferralUrl(referralCode);
      await shareNative(url);
    }
  };

  // Force body to be black
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // Check if Web Share API is supported
  useEffect(() => {
    setSupportsWebShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  if (status === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink}>
          <img src="/icon" alt="Syns6 Icon" className={styles.icon} />
          {/* <Syns6Logo /> */}
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          
          
          <h1 className={styles.title}>You're on the list!</h1>
          
          <div className={styles.message}>
            <p className={styles.messageSecondary}>
              We're working hard to get everyone in. You'll receive an invite at{" "}
              <span className={styles.email}>{session.user?.email}</span> as soon as we're ready.
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>10,000+</div>
              <div className={styles.statLabel}>People waiting</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>~2 weeks</div>
              <div className={styles.statLabel}>Average wait time</div>
            </div>
          </div>

          <div className={styles.cta}>
            <p className={styles.ctaText}>Want to skip the line?</p>
            <p className={styles.ctaSubtext}>
              Share Syns6 with friends and this will bump you up!
            </p>

            {referralCode && (
              <>
                {supportsWebShare && (
                  <div className={styles.nativeShareContainer}>
                    <button
                      onClick={handleNativeShare}
                      className={styles.nativeShareButton}
                    >
                      Share with friends
                    </button>
                  </div>
                )}

                <div className={styles.referralLink}>
                  <input
                    type="text"
                    value={getReferralUrl(referralCode)}
                    readOnly
                    className={styles.referralInput}
                  />
                  <button onClick={handleCopy} className={styles.copyButton}>
                    {copied ? "Copied! ✓" : "Copy"}
                  </button>
                </div>

                <div className={styles.socialButtons}>
                  <a
                    href={getSocialShareUrls(getReferralUrl(referralCode)).twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialButton}
                  >
                    Twitter
                  </a>
                  <a
                    href={getSocialShareUrls(getReferralUrl(referralCode)).facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialButton}
                  >
                    Facebook
                  </a>
                  <a
                    href={getSocialShareUrls(getReferralUrl(referralCode)).whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialButton}
                  >
                    WhatsApp
                  </a>
                  <a
                    href={getSocialShareUrls(getReferralUrl(referralCode)).telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialButton}
                  >
                    Telegram
                  </a>
                </div>

                {referralCount > 0 && (
                  <p className={styles.referralStats}>
                    🎉 You've referred <strong>{referralCount}</strong> friend{referralCount !== 1 ? 's' : ''}!
                  </p>
                )}
              </>
            )}
          </div>

          <div className={styles.actions}>
            <Link href="/" className={styles.backButton}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      
    </div>
  );
}

