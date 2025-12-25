import styles from '../page.module.css';
import localStyles from './faq.module.css';
import Link from 'next/link';
import { Logo } from '@/components/ds';

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about syns6, the free macOS karaoke app.',
};

export default function FAQPage() {
  return (
    <div className={styles.landingPage}>
      <main className={styles.landingMain}>
        {/* Header with Logo */}
        <header className={styles.header}>
          <Link href="/" className={styles.logoWrapper}>
            <Logo />
          </Link>
        </header>
        
        <section className={localStyles.content}>
          <h1 className={localStyles.title}>Frequently Asked Questions</h1>
          
          <div className={localStyles.faqSection}>
            <article className={localStyles.faqItem}>
              <h2>Is syns6 really free?</h2>
              <p>
                Yes! syns6 is completely free to download and use. There are no subscriptions, 
                no hidden fees, no in-app purchases, and no account required. Just download the 
                app and start using it.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>What platforms does syns6 support?</h2>
              <p>
                syns6 is currently available as a native macOS application. We may expand to 
                other platforms in the future.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>Is this a commercial product?</h2>
              <p>
                No. syns6 is a non-commercial project provided free of charge. It is developed 
                as a passion project and is not intended for commercial use or distribution.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>How does syns6 get lyrics?</h2>
              <p>
                syns6 uses various online sources to fetch synchronized lyrics for your music. 
                The app detects what&apos;s currently playing on Spotify and attempts to find matching 
                lyrics automatically.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>What music sources work with syns6?</h2>
              <p>
                syns6 currently works with Spotify. Support for Apple Music, YouTube, and other 
                sources may be added in future updates.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>Do I need an account to use syns6?</h2>
              <p>
                No. syns6 does not require any registration, login, or account creation. 
                Download, install, and enjoy — no strings attached.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>What about copyright and legal issues?</h2>
              <p>
                <strong>Important:</strong> syns6 is provided as-is for personal use. The user 
                is solely responsible for ensuring their use of the app complies with applicable 
                laws and regulations, including copyright laws. syns6 does not host, distribute, 
                or store any copyrighted content. The app merely displays lyrics and visualizations 
                based on audio playing on your system.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>Does syns6 collect my data?</h2>
              <p>
                No. syns6 does not collect any data whatsoever. No analytics, no tracking, 
                no personal information, nothing. Your music and usage stay completely private 
                on your device.
              </p>
            </article>

            <article className={localStyles.faqItem}>
              <h2>How can I report bugs or request features?</h2>
              <p>
                Reach out to us on Instagram <a href="https://www.instagram.com/_syns6_/" target="_blank" rel="noopener noreferrer">@_syns6_</a>. 
                We welcome feedback and feature suggestions!
              </p>
            </article>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <p className={styles.copyright}>© 2025 syns6. All rights reserved.</p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/faq" className={styles.footerLink}>FAQ</Link>
              <Link href="/privacy" className={styles.footerLink}>Privacy & Data Protection</Link>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
