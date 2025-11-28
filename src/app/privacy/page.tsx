import Link from 'next/link';
import styles from './privacy.module.css';
import Syns6Logo from '@/components/Syns6Logo';

export const metadata = {
  title: 'Privacy Policy & Data Protection | syns6',
  description: 'Privacy Policy and Data Protection Agreement for syns6 - GDPR compliant.',
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/">
          <Syns6Logo />
        </Link>
      </div>

      <main className={styles.content}>
        <h1>Privacy Policy & Data Protection</h1>
        <p className={styles.lastUpdated}>Last Updated: November 28, 2025</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to syns6 ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our karaoke 
            visualization service. This document also serves as our Data Processing Agreement (DPA) and complies with the General 
            Data Protection Regulation (GDPR) and other applicable privacy laws.
          </p>
          <p>
            As the Data Controller, syns6 determines the purposes and means of processing your personal data.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Account Information</h3>
          <p>When you sign up through Spotify OAuth, we collect:</p>
          <ul>
            <li><strong>Profile Data:</strong> Your Spotify username, profile picture, and email address</li>
            <li><strong>Unique Identifiers:</strong> Spotify user ID and our internal user ID</li>
            <li><strong>Authentication Tokens:</strong> OAuth access and refresh tokens to interact with Spotify on your behalf</li>
          </ul>

          <h3>2.2 Spotify Playback Data</h3>
          <p>To provide our karaoke and visualization services, we access:</p>
          <ul>
            <li><strong>Currently Playing Track:</strong> Song title, artist, album, and track duration</li>
            <li><strong>Playback State:</strong> Whether you're playing, paused, or stopped</li>
            <li><strong>Playback Position:</strong> Current timestamp in the track for synced lyrics</li>
            <li><strong>Device Information:</strong> The device you're playing Spotify on</li>
            <li><strong>Audio Features:</strong> Track characteristics like instrumentalness to optimize lyrics display</li>
          </ul>

          <h3>2.3 Usage Data</h3>
          <p>We collect information about how you use our service:</p>
          <ul>
            <li><strong>Play History:</strong> Tracks you've played, play duration, and timestamps</li>
            <li><strong>Visualization Preferences:</strong> Your chosen visualization types and settings</li>
            <li><strong>Audio Preferences:</strong> Sensitivity, bass boost, and other audio settings</li>
            <li><strong>Hue Integration Settings:</strong> Bridge IP, username, and light intensity preferences (if you enable Hue integration)</li>
          </ul>

          <h3>2.4 Microphone Data</h3>
          <p>
            When you use our visualizations, we access your microphone to analyze audio in real-time. 
            <strong> This audio is processed locally in your browser and is never recorded, stored, or transmitted to our servers.</strong>
          </p>

          <h3>2.5 Payment Information</h3>
          <p>
            Payment processing is handled by Stripe. We store:
          </p>
          <ul>
            <li><strong>Stripe Customer ID:</strong> Links your account to Stripe</li>
            <li><strong>Subscription Details:</strong> Plan type (weekly/monthly/yearly), status, billing period, and trial information</li>
            <li><strong>Note:</strong> We never store your credit card details. All payment information is securely handled by Stripe.</li>
          </ul>

          <h3>2.6 Technical Data</h3>
          <ul>
            <li><strong>Browser Information:</strong> Browser type, version, and capabilities (WebGL support)</li>
            <li><strong>Device Data:</strong> Operating system, screen resolution</li>
            <li><strong>Referral Data:</strong> Referral codes for our referral program</li>
            <li><strong>Analytics:</strong> Page views, session duration, and feature usage (via Vercel Analytics)</li>
          </ul>

          <h3>2.7 Cookies and Local Storage</h3>
          <p>We use:</p>
          <ul>
            <li><strong>Session Cookies:</strong> To keep you logged in</li>
            <li><strong>Preference Cookies:</strong> To remember your visualization and audio settings</li>
            <li><strong>Local Storage:</strong> To cache lyrics and user preferences for offline access</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We process your data for the following purposes:</p>
          <ul>
            <li><strong>Provide the Service:</strong> Display synced lyrics, render visualizations, and control Spotify playback</li>
            <li><strong>Personalize Your Experience:</strong> Remember your preferences and pre-load lyrics for upcoming tracks</li>
            <li><strong>Process Payments:</strong> Manage your subscription through Stripe</li>
            <li><strong>Improve Our Service:</strong> Analyze usage patterns to enhance features and performance</li>
            <li><strong>AI Features:</strong> Generate custom visualizations based on your prompts (using Google AI)</li>
            <li><strong>Communication:</strong> Send service updates, subscription notifications, and promotional materials (with your consent)</li>
            <li><strong>Referral Program:</strong> Track and reward referrals</li>
            <li><strong>Legal Compliance:</strong> Comply with legal obligations and protect our rights</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Processors and Third-Party Services</h2>
          <p>
            We engage the following third-party data processors to provide our service. Each processor has been carefully 
            vetted for GDPR compliance and has appropriate data processing agreements in place.
          </p>

          <h3>4.1 Infrastructure and Hosting</h3>
          
          <h4>Vercel Inc.</h4>
          <ul>
            <li><strong>Purpose:</strong> Application hosting, edge functions, CDN, and analytics</li>
            <li><strong>Data Processed:</strong> All application data, user sessions, API requests, page views (anonymized)</li>
            <li><strong>Location:</strong> United States (with global edge network)</li>
            <li><strong>GDPR Compliance:</strong> EU-US Data Privacy Framework certified</li>
            <li><strong>Security:</strong> SOC 2 Type II certified</li>
            <li><strong>DPA:</strong> <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer">vercel.com/legal/dpa</a></li>
          </ul>

          <h4>Neon Database (Serverless PostgreSQL)</h4>
          <ul>
            <li><strong>Purpose:</strong> Database hosting and management</li>
            <li><strong>Data Processed:</strong> User accounts, preferences, play history, lyrics cache, subscriptions</li>
            <li><strong>Location:</strong> United States and Europe (region-selectable)</li>
            <li><strong>GDPR Compliance:</strong> GDPR-compliant, SOC 2 Type II certified</li>
            <li><strong>Security:</strong> Encryption at rest and in transit, automated backups</li>
            <li><strong>Privacy Policy:</strong> <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer">neon.tech/privacy-policy</a></li>
          </ul>

          <h3>4.2 Authentication</h3>
          
          <h4>Spotify AB</h4>
          <ul>
            <li><strong>Purpose:</strong> OAuth authentication and Spotify API integration</li>
            <li><strong>Data Processed:</strong> Spotify user ID, profile information, playback state, OAuth tokens</li>
            <li><strong>Location:</strong> Sweden (EU), with global infrastructure</li>
            <li><strong>GDPR Compliance:</strong> Fully GDPR compliant (EU-based company)</li>
            <li><strong>Privacy Policy:</strong> <a href="https://www.spotify.com/privacy" target="_blank" rel="noopener noreferrer">spotify.com/privacy</a></li>
          </ul>

          <h3>4.3 Payment Processing</h3>
          
          <h4>Stripe, Inc.</h4>
          <ul>
            <li><strong>Purpose:</strong> Payment processing and subscription management</li>
            <li><strong>Data Processed:</strong> Email, payment methods, billing information, subscription status</li>
            <li><strong>Location:</strong> United States and Europe (depending on your location)</li>
            <li><strong>GDPR Compliance:</strong> Fully GDPR compliant, PCI DSS Level 1 certified</li>
            <li><strong>Security:</strong> Industry-leading payment security, encrypted transactions</li>
            <li><strong>DPA:</strong> <a href="https://stripe.com/legal/dpa" target="_blank" rel="noopener noreferrer">stripe.com/legal/dpa</a></li>
            <li><strong>Note:</strong> syns6 does not store or process credit card information directly</li>
          </ul>

          <h3>4.4 AI and Machine Learning</h3>
          
          <h4>Google LLC (Gemini AI)</h4>
          <ul>
            <li><strong>Purpose:</strong> AI-powered visualization generation from user prompts</li>
            <li><strong>Data Processed:</strong> User-provided text prompts for visualization creation</li>
            <li><strong>Location:</strong> United States and global data centers</li>
            <li><strong>GDPR Compliance:</strong> EU-US Data Privacy Framework certified</li>
            <li><strong>DPA:</strong> <a href="https://cloud.google.com/terms/data-processing-addendum" target="_blank" rel="noopener noreferrer">cloud.google.com/terms/data-processing-addendum</a></li>
          </ul>

          <h3>4.5 Optional Integrations</h3>
          
          <h4>YouTube API (Google LLC)</h4>
          <ul>
            <li><strong>Purpose:</strong> Video search for music videos (optional feature)</li>
            <li><strong>Data Processed:</strong> Song and artist names for video search queries</li>
            <li><strong>Location:</strong> United States and global</li>
            <li><strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></li>
          </ul>

          <h4>PeerJS Cloud Server</h4>
          <ul>
            <li><strong>Purpose:</strong> WebRTC signaling for peer-to-peer session sharing (viewer mode)</li>
            <li><strong>Data Processed:</strong> Peer IDs, signaling data for WebRTC connections</li>
            <li><strong>Note:</strong> Video/audio streams are peer-to-peer and do not transit through servers</li>
            <li><strong>Privacy:</strong> <a href="https://peerjs.com" target="_blank" rel="noopener noreferrer">peerjs.com</a></li>
          </ul>
        </section>

        <section>
          <h2>5. International Data Transfers</h2>
          <p>
            Personal data may be transferred to and processed in countries outside the European Economic Area (EEA), 
            including the United States. We ensure such transfers comply with GDPR through:
          </p>
          <ul>
            <li><strong>Standard Contractual Clauses (SCCs):</strong> Approved by the European Commission for data transfers</li>
            <li><strong>EU-US Data Privacy Framework:</strong> For transfers to certified US companies (Vercel, Google, Stripe)</li>
            <li><strong>Adequacy Decisions:</strong> For transfers to countries with adequate data protection (e.g., UK, Switzerland)</li>
            <li><strong>Processor Agreements:</strong> All processors maintain GDPR-compliant data processing agreements</li>
          </ul>
          <p>
            You have the right to request information about the safeguards we use for international data transfers.
          </p>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <p>We implement comprehensive technical and organizational measures to protect your personal data:</p>

          <h3>6.1 Technical Security Measures</h3>
          <ul>
            <li><strong>Encryption in Transit:</strong> All data transmissions use TLS/SSL encryption</li>
            <li><strong>Encryption at Rest:</strong> Database storage is encrypted</li>
            <li><strong>Secure Authentication:</strong> OAuth 2.0 for Spotify integration</li>
            <li><strong>Web Application Firewall (WAF):</strong> Protection against common attacks</li>
            <li><strong>DDoS Mitigation:</strong> Protection against denial-of-service attacks</li>
            <li><strong>Regular Updates:</strong> Security patches and updates applied promptly</li>
          </ul>

          <h3>6.2 Organizational Security Measures</h3>
          <ul>
            <li><strong>Access Controls:</strong> Principle of least privilege, role-based access</li>
            <li><strong>Security Audits:</strong> Regular vulnerability assessments</li>
            <li><strong>Employee Training:</strong> Data protection and security awareness</li>
            <li><strong>Incident Response:</strong> Documented procedures for security incidents</li>
            <li><strong>Data Breach Protocols:</strong> 72-hour notification requirement under GDPR</li>
          </ul>

          <h3>6.3 Processor Security Certifications</h3>
          <p>Our data processors maintain industry-standard certifications:</p>
          <ul>
            <li>SOC 2 Type II certification (Vercel, Neon, Stripe)</li>
            <li>ISO 27001 certification (Stripe, Google)</li>
            <li>PCI DSS Level 1 compliance (Stripe)</li>
          </ul>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <p>We retain personal data only as long as necessary for the purposes outlined in this policy:</p>
          <ul>
            <li><strong>Account Data:</strong> Duration of active account plus 30 days after deletion request</li>
            <li><strong>Play History:</strong> 2 years for analytics and service improvement</li>
            <li><strong>Subscription Data:</strong> 7 years for tax and legal compliance (as required by law)</li>
            <li><strong>Cached Lyrics:</strong> Indefinitely (anonymized, contains no personal data)</li>
            <li><strong>Analytics Data:</strong> 24 months in anonymized form</li>
            <li><strong>Support Communications:</strong> 3 years</li>
            <li><strong>Backups:</strong> Securely deleted according to our retention schedule</li>
          </ul>
          <p>
            After these retention periods, personal data is securely deleted or anonymized in compliance with GDPR requirements.
          </p>
        </section>

        <section>
          <h2>8. Your Rights (GDPR)</h2>
          <p>Under GDPR and other applicable laws, you have the following rights:</p>
          
          <h3>8.1 Right to Access</h3>
          <p>Request a copy of your personal data we hold about you.</p>

          <h3>8.2 Right to Rectification</h3>
          <p>Request correction of inaccurate or incomplete personal data.</p>

          <h3>8.3 Right to Erasure ("Right to be Forgotten")</h3>
          <p>Request deletion of your personal data in certain circumstances.</p>

          <h3>8.4 Right to Restriction of Processing</h3>
          <p>Request that we limit the processing of your personal data.</p>

          <h3>8.5 Right to Data Portability</h3>
          <p>Receive your personal data in a structured, commonly used, machine-readable format.</p>

          <h3>8.6 Right to Object</h3>
          <p>Object to processing of your personal data for direct marketing or legitimate interests.</p>

          <h3>8.7 Right to Withdraw Consent</h3>
          <p>Withdraw your consent at any time where processing is based on consent (e.g., revoke Spotify permissions).</p>

          <h3>8.8 Right to Lodge a Complaint</h3>
          <p>File a complaint with your local data protection authority if you believe your rights have been violated.</p>

          <h3>How to Exercise Your Rights</h3>
          <p>
            To exercise any of these rights, contact us at <a href="mailto:privacy@syns6.com">privacy@syns6.com</a>. 
            We will respond within 30 days as required by GDPR. You may also contact our EU representative at 
            <a href="mailto:eu-rep@syns6.com">eu-rep@syns6.com</a> if you are located in the European Union.
          </p>
        </section>

        <section>
          <h2>9. Data Breach Notification</h2>
          <p>
            In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will:
          </p>
          <ul>
            <li><strong>Notify You:</strong> Within 72 hours of becoming aware of the breach</li>
            <li><strong>Notify Authorities:</strong> Report to relevant supervisory authorities as required by GDPR</li>
            <li><strong>Provide Details:</strong> Information about the nature of the breach, affected data, and mitigation measures</li>
            <li><strong>Take Action:</strong> Immediate steps to contain and remediate the breach</li>
            <li><strong>Prevent Recurrence:</strong> Implement additional safeguards to prevent similar breaches</li>
          </ul>
        </section>

        <section>
          <h2>10. Children's Privacy</h2>
          <p>
            Our service is not intended for users under 13 years of age. We do not knowingly collect personal data from children under 13. 
            If you believe we have collected data from a child under 13, please contact us immediately at 
            <a href="mailto:privacy@syns6.com">privacy@syns6.com</a>, and we will take steps to delete such information.
          </p>
        </section>

        <section>
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. 
            We will notify you of significant changes:
          </p>
          <ul>
            <li><strong>Email Notification:</strong> For material changes that affect your rights</li>
            <li><strong>Website Banner:</strong> Prominent notice on our website</li>
            <li><strong>30 Days Notice:</strong> For changes to subscription pricing or terms</li>
          </ul>
          <p>
            Your continued use of the service after changes constitutes acceptance of the updated policy. 
            The "Last Updated" date at the top of this page indicates when the policy was last revised.
          </p>
        </section>

        <section>
          <h2>12. Sub-Processor Changes</h2>
          <p>
            We reserve the right to engage new sub-processors or change existing ones as needed to provide and improve our service. 
            When we do:
          </p>
          <ul>
            <li>We will update this policy to reflect changes</li>
            <li>Notify users via email of material changes to sub-processors</li>
            <li>Provide at least 30 days' notice before engaging new sub-processors that handle personal data</li>
            <li>Allow you to object to the use of a new sub-processor</li>
          </ul>
        </section>

        <section>
          <h2>13. Contact Us</h2>
          <p>If you have questions about this privacy policy, want to exercise your rights, or have concerns about how your data is processed, contact us at:</p>
          <ul>
            <li><strong>Privacy Inquiries:</strong> <a href="mailto:privacy@syns6.com">privacy@syns6.com</a></li>
            <li><strong>General Support:</strong> <a href="mailto:support@syns6.com">support@syns6.com</a></li>
            <li><strong>EU Representative:</strong> <a href="mailto:eu-rep@syns6.com">eu-rep@syns6.com</a> (for EU residents)</li>
            <li><strong>Social Media:</strong> <a href="https://x.com/_syns6_" target="_blank" rel="noopener noreferrer">@_syns6_</a> on Twitter/X</li>
          </ul>
        </section>

        <div className={styles.backLink}>
          <Link href="/">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
