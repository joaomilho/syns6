import Link from 'next/link';
import styles from './terms.module.css';
import { Logo } from '@/components/ds';

export const metadata = {
  title: 'Terms of Service | syns6',
  description: 'Terms of Service and Subscription Agreement for syns6.',
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/">
          <Logo />
        </Link>
      </div>

      <main className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last Updated: November 28, 2025</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using syns6 ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and syns6 ("we," "us," or "our").
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            syns6 is a karaoke visualization platform that integrates with Spotify to provide:
          </p>
          <ul>
            <li>Real-time synced lyrics for songs playing on your Spotify account</li>
            <li>Interactive 3D audio visualizations that respond to music and microphone input</li>
            <li>AI-powered custom visualization generation</li>
            <li>Smart home integration (Philips Hue lights)</li>
            <li>Session sharing with viewer mode for friends</li>
          </ul>
          <p>
            The Service requires an active Spotify account (Premium recommended for full functionality) and compatible hardware 
            (microphone, WebGL-capable browser).
          </p>

          <div className={styles.importantNotice}>
            <h3>⚠️ Personal Use Only</h3>
            <p>
              <strong>syns6 is designed for personal, private, and non-commercial use only.</strong> This Service is intended 
              for individual enjoyment in private settings such as your home.
            </p>
            <p>
              Spotify's Terms of Service explicitly prohibit public performance, commercial use, or broadcasting of their streaming 
              content. As stated in{' '}
              <a 
                href="https://www.spotify.com/us/legal/end-user-agreement/#8-export-control-and-sanctions" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Spotify's User Agreement (Section 8)
              </a>
              , you may not:
            </p>
            <ul>
              <li>Use the Service for public performances, broadcasting, or commercial purposes</li>
              <li>Stream music in commercial venues (bars, restaurants, stores, etc.)</li>
              <li>Broadcast or publicly perform music from Spotify</li>
              <li>Use the Service for any commercial karaoke business</li>
            </ul>
            <p>
              <strong>By using syns6, you acknowledge and agree that:</strong>
            </p>
            <ul>
              <li>You will use the Service only for personal, private, non-commercial purposes</li>
              <li>You will comply with all Spotify Terms of Service and licensing restrictions</li>
              <li>You are responsible for ensuring your use complies with applicable copyright laws</li>
              <li>syns6 is not liable for any misuse of Spotify's streaming service</li>
            </ul>
            <p>
              For commercial or public performance rights, please contact the appropriate music licensing organizations 
              (e.g., ASCAP, BMI, SESAC) or use a commercial music service designed for business use.
            </p>
          </div>
        </section>

        <section>
          <h2>3. Subscription Agreement</h2>
          
          <h3>3.1 Subscription Plans</h3>
          <p>We offer the following subscription plans:</p>
          <ul>
            <li><strong>Weekly Plan:</strong> Billed weekly after the free trial period</li>
            <li><strong>Monthly Plan:</strong> Billed monthly after the free trial period</li>
            <li><strong>Yearly Plan:</strong> Billed annually after the free trial period</li>
          </ul>
          <p>Current pricing is displayed on our pricing page and varies by region and currency.</p>

          <h3>3.2 Free Trial</h3>
          <p>
            New users are eligible for a <strong>3-day free trial</strong> on any subscription plan. During the trial:
          </p>
          <ul>
            <li>No credit card is required to start the trial (for Product Hunt users during promotional period)</li>
            <li>You have full access to all features</li>
            <li>Your subscription will automatically cancel at the end of the trial period unless you choose to continue</li>
            <li><strong>Important:</strong> If you choose to continue after the trial, you will be charged according to your selected plan</li>
          </ul>
          <p>
            Free trials are limited to one per user. We reserve the right to verify eligibility and deny free trials 
            in cases of suspected abuse.
          </p>

          <h3>3.3 Billing and Payment</h3>
          <ul>
            <li>Payments are processed securely through Stripe</li>
            <li>By subscribing, you authorize us to charge your payment method on a recurring basis</li>
            <li>Billing begins immediately after your free trial ends if you choose to continue</li>
            <li>Weekly subscriptions renew every 7 days</li>
            <li>Monthly subscriptions renew every 30 days</li>
            <li>Yearly subscriptions renew every 365 days</li>
            <li>All fees are non-refundable except as required by law</li>
          </ul>

          <h3>3.4 Price Changes</h3>
          <p>
            We reserve the right to modify subscription pricing. We will provide at least 30 days' notice before any price 
            increase. Continuing to use the Service after a price change constitutes acceptance of the new pricing.
          </p>

          <h3>3.5 Cancellation and Refunds</h3>
          <ul>
            <li>You may cancel your subscription at any time through your account settings or by contacting support</li>
            <li>After the free trial, subscriptions automatically cancel unless you choose to continue</li>
            <li>If you cancel, you'll retain access until the end of your current billing period</li>
            <li>No refunds are provided for partial subscription periods</li>
            <li>We do not provide refunds for unused portions of your subscription</li>
            <li>Refunds may be issued at our sole discretion for exceptional circumstances</li>
          </ul>

          <h3>3.6 Failed Payments</h3>
          <p>
            If a payment fails:
          </p>
          <ul>
            <li>We will attempt to charge your payment method up to 3 times</li>
            <li>Your access to premium features may be suspended</li>
            <li>Your subscription may be canceled if payment cannot be processed</li>
            <li>You are responsible for any charges incurred due to failed payments, including bank fees</li>
          </ul>
        </section>

        <section>
          <h2>4. Account Requirements</h2>
          <ul>
            <li>You must be at least 13 years old to use the Service</li>
            <li>You must have a valid Spotify account</li>
            <li>You must provide accurate and complete information during registration</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must not share your account with others</li>
            <li>One account per user; multiple accounts are prohibited</li>
          </ul>
        </section>

        <section>
          <h2>5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Violate any laws or regulations in your jurisdiction</li>
            <li>Infringe on intellectual property rights of others</li>
            <li>Attempt to reverse engineer, decompile, or hack the Service</li>
            <li>Use automated scripts, bots, or scrapers to access the Service</li>
            <li>Abuse the referral program through fraudulent means</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Upload malicious code or viruses</li>
            <li>Circumvent any access restrictions or security measures</li>
            <li>Use the Service to display copyrighted content without authorization</li>
          </ul>
        </section>

        <section>
          <h2>6. Intellectual Property</h2>
          
          <h3>6.1 Our Rights</h3>
          <p>
            All content, features, and functionality of the Service, including but not limited to software, visualizations, 
            designs, text, graphics, and logos, are owned by syns6 and protected by copyright, trademark, and other 
            intellectual property laws.
          </p>

          <h3>6.2 Your Rights</h3>
          <p>
            You retain ownership of any content you create using our AI visualization generator. However, by using the Service, 
            you grant us a non-exclusive, worldwide, royalty-free license to display and store your generated visualizations 
            for the purpose of providing the Service.
          </p>

          <h3>6.3 Third-Party Content</h3>
          <p>
            Lyrics and music content are provided by third-party services (Spotify, LRCLIB, NetEase). We do not claim ownership 
            of this content. You must comply with Spotify's terms of service when using the Service.
          </p>
        </section>

        <section>
          <h2>7. Third-Party Integrations</h2>
          
          <h3>7.1 Spotify</h3>
          <p>
            Our Service requires integration with Spotify. Your use of Spotify is governed by Spotify's Terms of Service. 
            We are not responsible for Spotify's actions or policies. If Spotify terminates your account or access, 
            it may affect your ability to use our Service.
          </p>

          <h3>7.2 Stripe</h3>
          <p>
            Payments are processed through Stripe. Your payment information is subject to Stripe's terms and privacy policy. 
            We do not store your credit card information.
          </p>

          <h3>7.3 Other Services</h3>
          <p>
            The Service may integrate with other third-party services (Philips Hue, Google AI, YouTube). Your use of these 
            services is subject to their respective terms.
          </p>
        </section>

        <section>
          <h2>8. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
            INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
            <li>That the Service will be uninterrupted, secure, or error-free</li>
            <li>That defects will be corrected</li>
            <li>The accuracy or completeness of lyrics or other content</li>
          </ul>
          <p>
            Some jurisdictions do not allow the exclusion of implied warranties, so some of the above exclusions may not apply to you.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNS6 SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, revenue, data, or use</li>
            <li>Damage to hardware or software resulting from use of the Service</li>
            <li>Any damages arising from third-party services (Spotify, Stripe, etc.)</li>
          </ul>
          <p>
            Our total liability to you for all claims related to the Service shall not exceed the amount you paid us 
            in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless syns6, its officers, directors, employees, and agents from any claims, 
            damages, losses, liabilities, and expenses (including legal fees) arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Your violation of any laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2>11. Termination</h2>
          
          <h3>11.1 By You</h3>
          <p>
            You may terminate your account at any time by canceling your subscription and contacting support to delete your account.
          </p>

          <h3>11.2 By Us</h3>
          <p>
            We reserve the right to suspend or terminate your account at any time, without notice, for:
          </p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Fraudulent or illegal activity</li>
            <li>Abuse of the Service or other users</li>
            <li>Non-payment of fees</li>
            <li>Any reason at our sole discretion</li>
          </ul>

          <h3>11.3 Effect of Termination</h3>
          <p>
            Upon termination:
          </p>
          <ul>
            <li>Your access to the Service will immediately cease</li>
            <li>Your data may be deleted (subject to our data retention policies)</li>
            <li>You remain liable for any outstanding fees</li>
            <li>Sections that by their nature should survive termination will continue to apply</li>
          </ul>
        </section>

        <section>
          <h2>12. Modifications to the Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, 
            with or without notice. We are not liable to you or any third party for any modification, suspension, 
            or discontinuance of the Service.
          </p>
        </section>

        <section>
          <h2>13. Modifications to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by email or through 
            a prominent notice on the Service. Your continued use after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>14. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
          </p>
          <p>
            Any disputes arising from these Terms or the Service shall be resolved through:
          </p>
          <ol>
            <li><strong>Informal Negotiation:</strong> Contact us at support@syns6.com to resolve the issue</li>
            <li><strong>Binding Arbitration:</strong> If informal resolution fails, disputes will be resolved through binding arbitration</li>
          </ol>
          <p>
            You agree to waive your right to participate in class actions or class arbitrations.
          </p>
        </section>

        <section>
          <h2>15. Miscellaneous</h2>
          
          <h3>15.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy & Data Protection, constitute the entire agreement between you and syns6.
          </p>

          <h3>15.2 Severability</h3>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
          </p>

          <h3>15.3 Waiver</h3>
          <p>
            Our failure to enforce any right or provision does not constitute a waiver of that right or provision.
          </p>

          <h3>15.4 Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our written consent. We may assign these Terms without restriction.
          </p>

          <h3>15.5 Force Majeure</h3>
          <p>
            We are not liable for delays or failures in performance resulting from causes beyond our reasonable control.
          </p>
        </section>

        <section>
          <h2>16. Contact Information</h2>
          <p>If you have questions about these Terms, contact us at:</p>
          <ul>
            <li>Email: <a href="mailto:support@syns6.com">support@syns6.com</a></li>
            <li>Twitter: <a href="https://x.com/_syns6_" target="_blank" rel="noopener noreferrer">@_syns6_</a></li>
          </ul>
        </section>

        <div className={styles.backLink}>
          <Link href="/">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}

