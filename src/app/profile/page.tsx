"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
      <main className={styles.main}>
        <div className={styles.header}>
          <Link href="/" className={styles.backButton}>
            ← Back
          </Link>
          <h1>Profile</h1>
        </div>

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

        <div className={styles.sessionInfo}>
          <h3>Session Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Access Token:</span>
              <span className={styles.value}>
                {session.accessToken
                  ? `${session.accessToken.substring(0, 30)}...`
                  : "Not available"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Refresh Token:</span>
              <span className={styles.value}>
                {session.refreshToken ? "✓ Available" : "Not available"}
              </span>
            </div>
            {session.expiresAt && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Token Expires:</span>
                <span className={styles.value}>
                  {new Date(session.expiresAt * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/player" className={styles.primaryButton}>
            Open Player
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={styles.dangerButton}
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}

