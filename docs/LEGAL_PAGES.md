# Legal Pages Implementation

This document summarizes the legal pages created for syns6.

## Pages Created

### 1. Privacy Policy (`/privacy`)
**Location:** `/src/app/privacy/page.tsx`

Comprehensive privacy policy covering:
- **Data Collection:**
  - Account information (Spotify OAuth, email, profile)
  - Spotify playback data (currently playing, playback state, audio features)
  - Usage data (play history, preferences, visualization settings)
  - Microphone data (processed locally, never stored)
  - Payment information (via Stripe)
  - Technical data (browser info, device data, analytics)
  - Cookies and local storage

- **Data Usage:**
  - Service provision (lyrics, visualizations, playback control)
  - Personalization (preferences, pre-loading)
  - Payment processing
  - Service improvement and analytics
  - AI features (visualization generation)
  - Referral program tracking

- **Third-Party Services:**
  - Spotify (OAuth, playback control)
  - Stripe (payments)
  - Google AI/Gemini (AI visualizations)
  - YouTube API (video search)
  - LRCLIB/NetEase (lyrics)
  - PeerJS (peer-to-peer sharing)
  - Vercel (hosting, analytics)
  - Neon Database (data storage)

- **User Rights:**
  - Access, rectification, erasure
  - Data portability, objection
  - Withdraw consent
  - Lodge complaints

### 2. Terms of Service (`/terms`)
**Location:** `/src/app/terms/page.tsx`

Comprehensive terms including:
- **Service Description:**
  - Karaoke platform with Spotify integration
  - Real-time synced lyrics
  - Interactive 3D visualizations
  - AI-powered custom visualization generation
  - Smart home integration (Hue lights)
  - Session sharing with viewer mode

- **Subscription Agreement:**
  - **Free Trial:** 3 days, no credit card required (for Product Hunt users)
  - **Plans:** Weekly, Monthly, Yearly
  - **Billing:** Automatic renewal unless canceled
  - **Cancellation:** Subscriptions auto-cancel after trial unless user chooses to continue
  - **Refunds:** No refunds for partial periods (except as required by law)
  - **Price Changes:** 30 days notice

- **User Conduct:**
  - Age requirement (13+)
  - Prohibited activities (illegal use, hacking, abuse)
  - Account security responsibilities

- **Intellectual Property:**
  - syns6 owns the platform
  - Users retain ownership of AI-generated visualizations
  - Third-party content (Spotify, lyrics) governed by their terms

- **Warranties and Liability:**
  - Service provided "as is"
  - Limited liability
  - Indemnification clauses

- **Termination:**
  - User can cancel anytime
  - syns6 can terminate for violations
  - Effect of termination on data

### 3. Data Processing Agreement (`/dpa`)
**Location:** `/src/app/dpa/page.tsx`

GDPR-compliant DPA covering:
- **Definitions:**
  - Personal data, processing, data controller/processor
  - Data subject rights

- **Data Processors (Sub-Processors):**
  - **Infrastructure:** Vercel (hosting), Neon (database)
  - **Authentication:** Spotify (OAuth)
  - **Payments:** Stripe (PCI DSS Level 1)
  - **AI:** Google Gemini (visualization generation)
  - **Content:** LRCLIB, NetEase (lyrics), YouTube API
  - **Communication:** PeerJS (WebRTC signaling)
  - **Analytics:** Vercel Analytics (privacy-first)

- **Data Security:**
  - Technical measures (encryption, TLS/SSL, OAuth, WAF)
  - Organizational measures (access controls, audits, training)
  - Processor certifications (SOC 2, ISO 27001, PCI DSS)

- **International Transfers:**
  - Standard Contractual Clauses (SCCs)
  - EU-US Data Privacy Framework
  - Adequacy decisions

- **Data Subject Rights:**
  - Detailed explanation of GDPR rights
  - How to exercise rights
  - Response timelines (30 days)

- **Data Retention:**
  - Account data: Active account + 30 days
  - Play history: 2 years
  - Subscription data: 7 years (tax/legal)
  - Cached lyrics: Indefinite (anonymized)

- **Data Breach Notification:**
  - 72-hour notification requirement
  - Breach mitigation procedures

## Footer Implementation

### Landing Page Footer (`/src/app/page.tsx`)
Added footer section with:
- Copyright notice
- Links to Privacy Policy, Terms of Service, and DPA
- Responsive design (stacks on mobile)

**Styling:** `/src/app/page.module.css`
- Modern, clean footer design
- Hover effects on links
- Mobile-responsive layout

### Pricing Page Terms Link (`/src/app/pricing/page.tsx`)
Added terms acceptance notice:
- "By subscribing, you agree to our Terms of Service and Privacy Policy"
- Links to both pages
- Positioned below the subscription button

**Styling:** `/src/app/pricing/pricing.module.css`
- Subtle, non-intrusive design
- Color-coded links matching brand

## Design Notes

### Styling
All legal pages share a consistent design:
- Dark theme matching app aesthetic (#000 background)
- Clean, readable typography
- Proper heading hierarchy (h1 → h2 → h3 → h4)
- Sticky top bar with logo
- Responsive design (mobile-optimized)
- Professional gradient on main heading
- Color-coded links (#4a9eff)
- Proper spacing and line height for readability

### Navigation
- Each legal page has a "Back to Home" link
- Top bar includes syns6 logo (links to home)
- Footer on landing page links to all legal pages
- Pricing page links to terms before subscription

### Mobile Optimization
- Font sizes adjust for mobile
- Padding reduces on small screens
- Footer stacks vertically
- Sticky navigation remains functional

## File Structure

```
src/app/
├── privacy/
│   ├── page.tsx
│   └── privacy.module.css
├── terms/
│   ├── page.tsx
│   └── terms.module.css
├── dpa/
│   ├── page.tsx
│   └── dpa.module.css
├── page.tsx (updated footer)
├── page.module.css (updated footer styles)
├── pricing/
│   ├── page.tsx (added terms link)
│   └── pricing.module.css (added terms notice styles)
```

## URLs

- Privacy Policy: `https://yoursite.com/privacy`
- Terms of Service: `https://yoursite.com/terms`
- DPA: `https://yoursite.com/dpa`

## SEO

All pages include proper metadata:
- Title tags
- Meta descriptions
- Last updated dates

## Legal Compliance

These pages cover:
- ✅ GDPR (General Data Protection Regulation)
- ✅ EU-US Data Privacy Framework
- ✅ Standard Contractual Clauses (SCCs)
- ✅ PCI DSS (via Stripe)
- ✅ SOC 2 Type II compliance (sub-processors)
- ✅ ISO 27001 certification (sub-processors)

## Contact Information

All legal pages reference:
- **Privacy inquiries:** privacy@syns6.com
- **General support:** support@syns6.com
- **EU representative:** eu-rep@syns6.com
- **Social:** @_syns6_ (Twitter/X)

## Next Steps

1. **Review and customize:**
   - Update "Governing Law" jurisdiction in Terms (section 14)
   - Add actual contact email addresses
   - Set up email aliases (privacy@, support@, eu-rep@)

2. **Legal review:**
   - Have a lawyer review these documents
   - Adjust based on your specific jurisdiction
   - Update for any additional services/features

3. **Ongoing maintenance:**
   - Update dates when policies change
   - Notify users of material changes (30 days for pricing)
   - Keep sub-processor list current

4. **Cookie consent (optional):**
   - Consider adding a cookie banner if required in your jurisdiction
   - EU users may require explicit consent

## Notes

- All subscription billing is handled by Stripe (PCI compliant)
- Microphone audio is processed locally and never stored
- Peer-to-peer connections don't transit through servers
- Cached lyrics contain no personal data
- Free trial auto-cancels unless user chooses to continue

