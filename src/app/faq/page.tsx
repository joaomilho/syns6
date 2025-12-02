'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import styles from './faq.module.css';

// FAQ data structure
const faqData = [
  {
    category: `Getting Started`,
    questions: [
      {
        id: `what-is-syns6`,
        question: `What is syns6?`,
        answer: `syns6 is a next-generation karaoke platform that transforms your home into a neon-soaked private club. It combines live 3D visualizations that react to your voice and music, AI-powered custom visual creation, lyrics for virtually any song in any genre or language, and smart home integration with devices like Philips Hue lights. Think of it as your personal karaoke club where you have complete control over the vibe.`,
      },
      {
        id: `how-to-start`,
        question: `How do I get started with syns6?`,
        answer: `Simply sign in with your Spotify account to get started. Once logged in, you can join the waitlist or start your free trial. The platform works directly in your web browser—no downloads or installations required. Just connect your Spotify, choose a song, and start singing with live visualizations.`,
      },
      {
        id: `spotify-required`,
        question: `Do I need a Spotify account to use syns6?`,
        answer: `Yes, syns6 requires a Spotify account for authentication and to access your music library. This allows us to provide seamless integration with your existing playlists and music preferences. You can use either a free or premium Spotify account to sign in.`,
      },
      {
        id: `device-compatibility`,
        question: `What devices can I use syns6 on?`,
        answer: `syns6 works on any device with a modern web browser, including desktop computers, laptops, tablets, and smartphones. For the best experience with 3D visualizations, we recommend using a device with a larger screen and good graphics capabilities. The platform is optimized for both desktop and mobile use.`,
      },
      {
        id: `offline-support`,
        question: `Does syns6 work offline?`,
        answer: `No, syns6 requires an active internet connection to function. The platform streams music from Spotify, fetches lyrics in real-time, and renders live visualizations, all of which require connectivity. We recommend a stable broadband or high-speed mobile connection for the best experience.`,
      },
    ],
  },
  {
    category: `Features`,
    questions: [
      {
        id: `viewer-mode`,
        question: `What is Viewer Mode and how do I share my session?`,
        answer: `Viewer Mode allows you to share your karaoke session with friends who can watch and sing along in real-time. You can generate a shareable link or QR code that lets your VIPs join your session remotely. They will see the same visualizations and lyrics you do, making it perfect for virtual karaoke parties or showing off your setup.`,
      },
      {
        id: 'microphone-karaoke',
        question: `Can I use my microphone for karaoke?`,
        answer: `Yes! syns6 uses your device's microphone to analyze your voice in real-time, which powers the live visualizations. The visualizations react to both the music and your singing, creating a truly interactive karaoke experience. Make sure to grant microphone permissions when prompted by your browser.`,
      },
    ],
  },
  {
    category: `Technical Requirements`,
    questions: [
      {
        id: `system-requirements`,
        question: `What are the system requirements and browser compatibility?`,
        answer: `syns6 requires a modern web browser with WebGL 2.0 support for the 3D visualizations. We recommend Chrome, Firefox, Safari, or Edge (latest versions). Your device should have a decent GPU for smooth visual rendering. If WebGL is not available, the app will automatically fall back to static images. For the best experience, use a device with at least 4GB of RAM and a stable internet connection.`,
      },
      {
        id: `internet-speed`,
        question: `What internet speed do I need?`,
        answer: `We recommend a minimum internet speed of 5 Mbps for smooth streaming and visualization rendering. Faster connections (10+ Mbps) will provide a better experience, especially when using Viewer Mode to share your session with others. The platform adapts to your connection quality automatically.`,
      },
      {
        id: `mobile-devices`,
        question: `Can I use syns6 on mobile devices?`,
        answer: `Absolutely! syns6 is fully responsive and works great on mobile devices. While the visualizations are optimized for larger screens, the mobile experience is still immersive and fun. Some advanced features like certain 3D visualizations may perform better on devices with more powerful processors.`,
      },
      {
        id: `browser-support`,
        question: `Which browsers are supported?`,
        answer: `syns6 works best on the latest versions of Chrome, Firefox, Safari, and Microsoft Edge. We recommend keeping your browser updated for optimal performance and security. WebGL support is required for 3D visualizations, which is available in all modern browsers.`,
      },
    ],
  },
  {
    category: `Pricing & Billing`,
    questions: [
      {
        id: `pricing`,
        question: `How much does syns6 cost?`,
        answer: `syns6 offers flexible subscription plans: Weekly, Monthly, and Yearly options with pricing that varies by currency and region. We currently support over 30 currencies worldwide. You can view exact pricing on our pricing page, which automatically detects and displays prices in your local currency.`,
      },
      {
        id: `free-trial`,
        question: `Is there a free trial?`,
        answer: `Yes! We offer a 3-day free trial for new users. Product Hunt users get an exclusive offer of one free week. The trial gives you full access to all premium features including AI visualization creator, Hue integration, and Viewer Mode.`,
      },
      {
        id: `credit-card-trial`,
        question: `Do I need a credit card for the free trial?`,
        answer: `No credit card is required to start your free trial. Simply sign in with your Spotify account and join the waitlist to get started. We believe everyone should be able to try syns6 risk-free.`,
      },
      {
        id: 'trial-ends',
        question: `What happens when my free trial ends?`,
        answer: `Your subscription will automatically cancel at the end of the trial period—you only pay if you choose to continue. There are no hidden charges or automatic renewals without your explicit consent. You'll receive notifications before your trial ends, giving you time to decide if you want to subscribe.`,
      },
      {
        id: 'cancel-anytime',
        question: `Can I cancel anytime?`,
        answer: `Yes, you can cancel your subscription at any time from your profile page. There are no cancellation fees or long-term commitments. When you cancel, you'll retain access to premium features until the end of your current billing period.`,
      },
      {
        id: 'currencies',
        question: `What currencies do you accept?`,
        answer: `We accept over 30 currencies including USD, EUR, GBP, JPY, AUD, CAD, and many more. Our pricing page automatically detects your location and displays prices in your local currency. You can also manually select your preferred currency from the dropdown menu.`,
      },
      {
        id: 'change-plan',
        question: `How do I change my subscription plan?`,
        answer: `You can upgrade or downgrade your subscription plan at any time from your profile page. Changes take effect at the start of your next billing cycle. If you upgrade mid-cycle, you'll be credited for the unused portion of your current plan.`,
      },
    ],
  },
  {
    category: `Account & Privacy`,
    questions: [
      {
        id: `data-usage`,
        question: `How is my data used?`,
        answer: `We take your privacy seriously. Your data is used solely to provide and improve the syns6 service. We store your Spotify account information for authentication, session preferences, and subscription status. We do not sell your personal data to third parties. For complete details, please review our Privacy Policy.`,
      },
      {
        id: `spotify-history`,
        question: `Does syns6 store my Spotify listening history?`,
        answer: `No, we do not store your Spotify listening history. We only access your currently playing track to display lyrics and synchronize visualizations. Your music preferences and playlists remain private on Spotify's servers.`,
      },
      {
        id: `delete-account`,
        question: `Can I delete my account?`,
        answer: `Yes, you can delete your account at any time from your profile page. This will permanently remove all your personal data, preferences, and subscription information from our servers. Please note that this action cannot be undone.`,
      },
      {
        id: 'payment-security',
        question: `Is my payment information secure?`,
        answer: `Absolutely. We use Stripe, an industry-leading payment processor, to handle all transactions. We never store your credit card details on our servers. All payment information is encrypted and processed securely through Stripe's PCI-compliant infrastructure.`,
      },
    ],
  },
  {
    category: `Troubleshooting`,
    questions: [
      {
        id: 'no-visualizations',
        question: `Why aren't the visualizations showing?`,
        answer: `If visualizations aren't appearing, first check that your browser supports WebGL by visiting a WebGL test page. Make sure you're using a modern browser (Chrome, Firefox, Safari, or Edge) and that hardware acceleration is enabled in your browser settings. If you're on mobile, some older devices may not support advanced 3D visualizations. Try refreshing the page or switching to a different visualization mode.`,
      },
      {
        id: 'no-lyrics',
        question: `Lyrics aren't appearing or why don't some songs have lyrics?`,
        answer: `While syns6 supports lyrics for the vast majority of songs across all genres and languages, some tracks may not have lyrics available in our database yet. This is particularly common with very new releases, instrumental tracks, or extremely obscure music. We're constantly expanding our lyrics database. If lyrics aren't showing for a song that should have them, try refreshing the page or checking your internet connection.`,
      },
      {
        id: `audio-sync`,
        question: `The audio is out of sync with the visuals`,
        answer: `Audio sync issues are usually caused by browser performance or network latency. Try closing other browser tabs or applications that might be using system resources. Ensure you have a stable internet connection. If the problem persists, try lowering the visualization quality settings or switching to a simpler visualization mode. Clearing your browser cache can also help.`,
      },
      {
        id: 'slow-performance',
        question: `Why is syns6 running slowly on my device?`,
        answer: `Performance issues typically occur on devices with limited GPU capabilities or when running resource-intensive visualizations. Try switching to a simpler visualization mode, closing unnecessary browser tabs, or using a device with better graphics capabilities. Make sure your browser is up to date and that hardware acceleration is enabled. On mobile devices, performance may vary based on your device's specifications.`,
      },
    ],
  },
  {
    category: `Music & Lyrics`,
    questions: [
      {
        id: `language-support`,
        question: `What languages are supported for lyrics?`,
        answer: `syns6 supports lyrics in over 50 languages, including English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Hindi, Russian, and many more. We support everything from Norwegian Black Metal to Memphis Hip Hop to Japanese Onkyokei. Our multilingual support ensures you can sing along to virtually any song in any language.`,
      },
      {
        id: 'request-lyrics',
        question: `Can I request lyrics for a specific song?`,
        answer: `While we don't currently have a formal lyrics request system, we're constantly expanding our database to include more songs across all genres and languages. If you encounter a song without lyrics, it may be added in future updates as our database grows. We prioritize adding lyrics for popular tracks and user-requested content.`,
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Structured data for SEO
  const structuredData = {
    '@context': `https://schema.org`,
    '@type': `FAQPage`,
    mainEntity: faqData.flatMap((category) =>
      category.questions.map((q) => ({
        '@type': `Question`,
        name: q.question,
        acceptedAnswer: {
          '@type': `Answer`,
          text: q.answer,
        },
      }))
    ),
  };

  // Fuzzy search with Fuse.js
  const filteredFAQData = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqData;
    }

    // Flatten all questions with their categories
    const allQuestions = faqData.flatMap((category) =>
      category.questions.map((q) => ({
        ...q,
        category: category.category,
      }))
    );

    // Configure Fuse.js for fuzzy search
    const fuse = new Fuse(allQuestions, {
      keys: [
        { name: 'question', weight: 2 }, // Prioritize question title
        { name: 'answer', weight: 1 },   // Lower priority for answer
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      distance: 100,  // Maximum distance between characters
      minMatchCharLength: 2,
      ignoreLocation: true, // Don't care where in the string the match is
      useExtendedSearch: false,
      findAllMatches: true,
    });

    // Search and get results
    const results = fuse.search(searchQuery);
    const matchedQuestions = results.map(result => result.item);

    // Return as a single category for flat display
    return matchedQuestions.length > 0
      ? [{ category: 'Search Results', questions: matchedQuestions }]
      : [];
  }, [searchQuery]);

  const totalResults = filteredFAQData.reduce(
    (acc, category) => acc + category.questions.length,
    0
  );

  return (
    <div className={styles.container}>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
          <h1 className={styles.title}>Frequently Asked Questions</h1>
          <p className={styles.subtitle}>
            Everything you need to know about syns6
          </p>
        </header>

        {/* Search Box */}
        <div className={styles.searchContainer}>
          <input
            type="search"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search FAQ"
          />
          {searchQuery && (
            <div className={styles.searchResults}>
              {totalResults} {totalResults === 1 ? `result` : `results`} found
            </div>
          )}
        </div>

        {/* FAQ Sections */}
        {filteredFAQData.length > 0 ? (
          <div className={styles.faqSections}>
            {filteredFAQData.map((category, categoryIndex) => (
              <section key={categoryIndex} className={styles.categorySection}>
                {!searchQuery && (
                  <h2 className={styles.categoryTitle}>{category.category}</h2>
                )}
                <div className={styles.questionsContainer}>
                  {category.questions.map((item) => (
                    <article key={item.id} className={styles.faqItem} id={item.id}>
                      {searchQuery && 'category' in item && item.category && (
                        <div className={styles.categoryBadge}>{item.category as string}</div>
                      )}
                      <h3 className={styles.question}>{item.question}</h3>
                      <p className={styles.answer}>{item.answer}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.noResults}>
            <p>No results found for &quot;{searchQuery}&quot;</p>
            <p className={styles.noResultsHint}>
              Try different keywords or browse all questions above
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Still have questions?{' '}
            <a href="https://www.instagram.com/_syns6_/" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              Contact us on Instagram
            </a>
          </p>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              Terms of Service
            </Link>
            <Link href="/pricing" className={styles.footerLink}>
              Pricing
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

