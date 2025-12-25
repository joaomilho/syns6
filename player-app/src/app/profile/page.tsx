"use client";

import Link from "next/link";
import { Logo } from "@/components/ds";
import styles from "./profile.module.css";

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <Link href="/player">
          <Logo />
        </Link>
      </div>

      <main className={styles.main}>
        <h1>Desktop App Mode</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '16px' }}>
          This app runs in desktop mode via Tauri.
          Authentication and subscriptions are not required.
        </p>
        <Link 
          href="/player" 
          style={{ 
            marginTop: '24px', 
            color: '#1DB954',
            textDecoration: 'underline'
          }}
        >
          Go to Player
        </Link>
      </main>
    </div>
  );
}
