import styles from '../page.module.css';
import localStyles from './terms.module.css';
import Link from 'next/link';
import { Logo } from '@/components/ds';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for syns6, the free macOS karaoke app.',
};

export default function TermsPage() {
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
          <h1 className={localStyles.title}>Terms of Service</h1>
          <p className={localStyles.lastUpdated}>Last updated: December 21, 2025</p>
          
          <div className={localStyles.section}>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using syns6, you agree to be bound by these Terms 
              of Service. If you do not agree to these terms, do not use the application.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>2. Free & Non-Commercial Use</h2>
            <p>
              syns6 is provided completely free of charge for personal, non-commercial use only. 
              The application is a passion project and is not intended for commercial purposes.
            </p>
            <ul>
              <li>There are no subscriptions, fees, or payments of any kind.</li>
              <li>No account registration is required.</li>
              <li>The app is provided &quot;as-is&quot; without warranties of any kind.</li>
            </ul>
          </div>

          <div className={localStyles.section}>
            <h2>3. User Responsibilities</h2>
            <div className={localStyles.warningBox}>
              <p>
                <strong>You are solely responsible for your use of syns6.</strong> By using this 
                application, you acknowledge and agree to the following:
              </p>
              <ul>
                <li>
                  <strong>Legal Compliance:</strong> You are responsible for ensuring that your 
                  use of syns6 complies with all applicable laws, regulations, and third-party 
                  rights, including but not limited to copyright, intellectual property, and 
                  privacy laws.
                </li>
                <li>
                  <strong>Content Responsibility:</strong> syns6 does not host, store, or 
                  distribute copyrighted content. The app displays lyrics and visualizations 
                  based on audio playing on your system. You are responsible for the legality 
                  of the content you play and view.
                </li>
                <li>
                  <strong>Personal Use Only:</strong> This application is intended for personal, 
                  private use only. You may not use syns6 for public performances, commercial 
                  venues, or any purpose that would require licensing.
                </li>
              </ul>
            </div>
          </div>

          <div className={localStyles.section}>
            <h2>4. Disclaimer of Warranties</h2>
            <p>
              SYNS6 IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF 
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the application will be uninterrupted, error-free, secure, 
              or free of viruses or other harmful components.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>5. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPERS OF SYNS6 SHALL NOT BE 
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
              OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR 
              ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
            </p>
            <ul>
              <li>Your use of or inability to use syns6;</li>
              <li>Any unauthorized access to or use of our servers or any personal information;</li>
              <li>Any third-party content or conduct;</li>
              <li>Any legal claims arising from your use of the application.</li>
            </ul>
          </div>

          <div className={localStyles.section}>
            <h2>6. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless the developers of syns6 from 
              and against any claims, liabilities, damages, losses, and expenses (including 
              reasonable attorneys&apos; fees) arising out of or in any way connected with your 
              use of the application or your violation of these Terms.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>7. Third-Party Services</h2>
            <p>
              syns6 may interact with third-party services for functionality such as fetching 
              lyrics. We are not responsible for the availability, accuracy, or content of 
              these third-party services, and your use of them is subject to their respective 
              terms and conditions.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>8. Modifications</h2>
            <p>
              We reserve the right to modify or discontinue syns6 at any time without notice. 
              We may also update these Terms from time to time. Continued use of the application 
              after any changes constitutes acceptance of the new Terms.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>9. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that 
              provision shall be limited or eliminated to the minimum extent necessary so that 
              these Terms shall otherwise remain in full force and effect.
            </p>
          </div>

          <div className={localStyles.section}>
            <h2>10. Contact</h2>
            <p>
              If you have questions about these Terms of Service, you can reach us on 
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
