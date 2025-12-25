import styles from '../page.module.css';
import localStyles from './privacy.module.css';
import Link from 'next/link';
import { Logo } from '@/components/ds';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for syns6, the free macOS karaoke app.',
};

export default function PrivacyPage() {
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
          <h1 className={localStyles.title}>Privacy & Data Protection</h1>
          <p className={localStyles.lastUpdated}>Last updated: December 21, 2025</p>
          
          <div className={localStyles.section}>
            <h2>Overview</h2>
            <p>
              syns6 is a free, non-commercial macOS application. We are committed to protecting 
              your privacy and being transparent about our data practices. This policy explains 
              what data we collect (if any) and how we use it.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>Free & Non-Commercial</h2>
            <p>
              syns6 is provided completely free of charge. It is a non-commercial project with 
              no payment processing, no subscriptions, and no financial transactions of any kind. 
              We do not collect payment information because there is nothing to pay for.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>Data Collection</h2>
            <p>
              <strong>We do not collect any data.</strong>
            </p>
            <ul>
              <li>
                <strong>No Analytics:</strong> We do not collect any usage statistics, crash 
                reports, or telemetry of any kind.
              </li>
              <li>
                <strong>No Personal Information:</strong> We do not collect your name, email, 
                address, or any other personally identifiable information.
              </li>
              <li>
                <strong>No Music Data:</strong> We do not track, log, or store information about 
                what music you listen to or what lyrics you view.
              </li>
              <li>
                <strong>No Account Required:</strong> syns6 does not require registration or 
                login, so we have no user accounts or credentials to store.
              </li>
              <li>
                <strong>Completely Private:</strong> Everything stays on your device. We have 
                no servers collecting your data.
              </li>
            </ul>
          </div>

          <div className={localStyles.section}>
            <h2>Third-Party Services</h2>
            <p>
              syns6 may connect to third-party services to fetch lyrics and other data. These 
              connections are made on your behalf and we do not share any personal information 
              with these services. Your requests are made directly from your device.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>Local Data</h2>
            <p>
              Any preferences or settings you configure in syns6 are stored locally on your 
              device. We do not sync this data to any servers.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>User Responsibility</h2>
            <div className={localStyles.warningBox}>
              <p>
                <strong>Important:</strong> syns6 is provided &quot;as-is&quot; for personal use only. 
                By using this application, you acknowledge and agree that:
              </p>
              <ul>
                <li>
                  You are solely responsible for ensuring your use of syns6 complies with all 
                  applicable laws and regulations, including copyright and intellectual property laws.
                </li>
                <li>
                  syns6 does not host, store, or distribute any copyrighted content. The app 
                  displays lyrics and visualizations based on audio playing on your system.
                </li>
                <li>
                  The developers of syns6 are not liable for any legal issues arising from your 
                  use of the application.
                </li>
              </ul>
            </div>
          </div>

          <div className={localStyles.section}>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be reflected 
              on this page with an updated &quot;Last updated&quot; date.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>Contact</h2>
            <p>
              If you have questions about this privacy policy, you can reach us on 
              Instagram <a href="https://www.instagram.com/_syns6_/" target="_blank" rel="noopener noreferrer">@_syns6_</a>.
            </p>
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
