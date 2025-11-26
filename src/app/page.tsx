"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { InstagramEmbed } from "react-social-media-embed";
import styles from "./page.module.css";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useFPS } from "@/hooks/useFPS";
import Syns6Logo from "@/components/Syns6Logo";
import ScrollVideo from "@/components/ScrollVideo";

// Component that uses searchParams - wrapped in Suspense
function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
      console.log('Referral code captured:', refCode);
    }
  }, [searchParams]);

  return null;
}

export default function Home() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null); // null = checking
  const { micData, enable: enableMic } = useMicrophoneAnalysis();
  const fps = useFPS();
  
  // Cycle through visualization images
  const vizImages = [
    'psychedelic.webp',
    
    'fractal.webp',
    
    
    
    'fftspectrum.webp',
    'animated.webp',
    'particles.webp',
    'waves.webp',
    
    'spectrum3d.webp',
    
    'wavespectrum.webp',
  ];
  const [currentVizIndex, setCurrentVizIndex] = useState(0);
  const [vizFading, setVizFading] = useState(false);

  // Cycle through lyrics screenshots
  const lyricsImages = [
    'behemoth.webp',
    'kraftwerk.webp',
    'mooki.webp',
    'sai-abhyankkar.webp',
  ];
  const [currentLyricsIndex, setCurrentLyricsIndex] = useState(0);

  // Translations of "Lyrics for all!" in 50+ languages
  const lyricsTranslations = [
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'fr', text: 'Paroles pour tous !' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'zh', text: '歌词为所有人！' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ta', text: 'அனைவருக்கும் பாடல் வரிகள்!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'he', text: '!מילים לכולם' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ar', text: '!كلمات لكل' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ru', text: 'Тексты для всех!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'hi', text: 'सभी के लिए गीत!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ja', text: 'みんなのための歌詞！' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ko', text: '모두를 위한 가사!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'tr', text: 'Herkes için şarkı sözleri!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'yi', text: '!ליריקס פאר אלעמען' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'th', text: 'เนื้อเพลงสำหรับทุกคน!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'bn', text: 'সবার জন্য গানের কথা!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'fa', text: '!ترانه برای همه' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ur', text: '!سب کے لیے گانے' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'el', text: 'Στίχοι για όλους!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'am', text: 'ለሁሉም ግጥሞች!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ms', text: 'Lirik untuk semua!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'de', text: 'Texte für alle!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'es', text: '¡Letras para todos!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'pt', text: 'Letras para todos!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'it', text: 'Testi per tutti!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'pl', text: 'Teksty dla wszystkich!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'uk', text: 'Тексти для всіх!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'vi', text: 'Lời bài hát cho tất cả!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'id', text: 'Lirik untuk semua!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'sw', text: 'Maneno ya nyimbo kwa wote!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ro', text: 'Versuri pentru toți!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'nl', text: 'Teksten voor iedereen!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'hu', text: 'Dalszövegek mindenkinek!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'cs', text: 'Texty pro všechny!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'sv', text: 'Texter för alla!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'fi', text: 'Sanat kaikille!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'no', text: 'Tekster for alle!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'da', text: 'Tekster til alle!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'sr', text: 'Текстови за све!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'bg', text: 'Текстове за всички!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ka', text: 'ტექსტები ყველასთვის!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'hy', text: 'Տեքստեր բոլորի համար!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'kk', text: 'Барлығына мәтіндер!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'az', text: 'Hamı üçün mahnı sözləri!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'kn', text: 'ಎಲ್ಲರಿಗೂ ಸಾಹಿತ್ಯ!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'te', text: 'అందరికీ సాహిత్యం!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'ml', text: 'എല്ലാവർക്കും വരികൾ!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'si', text: 'සියලු දෙනාට ගී පද!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'my', text: 'အားလုံးအတွက် စာသားများ!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'km', text: 'អត្ថបទសម្រាប់ទាំងអស់!' },
    { lang: 'en', text: 'Lyrics for all!' },
    { lang: 'lo', text: 'ເນື້ອເພງສໍາລັບທຸກຄົນ!' },
  ];
  const [currentTranslationIndex, setCurrentTranslationIndex] = useState(0);
  const [translationFading, setTranslationFading] = useState(false);

  // AI images to cycle through
  const aiImages = ['prompt.webp', 'result.webp'];
  const [currentAiIndex, setCurrentAiIndex] = useState(0);

  // Cycle through viz images every 6 seconds (slower) with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setVizFading(true);
      setTimeout(() => {
        setCurrentVizIndex((prev) => (prev + 1) % vizImages.length);
        setVizFading(false);
      }, 1000); // Half of the 2s transition
    }, 6000);

    return () => clearInterval(interval);
  }, [vizImages.length]);

  // Cycle through lyrics images every 6 seconds with crossfade
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLyricsIndex((prev) => (prev + 1) % lyricsImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [lyricsImages.length]);

  // Cycle through translations every 3 seconds with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setTranslationFading(true);
      setTimeout(() => {
        setCurrentTranslationIndex((prev) => (prev + 1) % lyricsTranslations.length);
        setTranslationFading(false);
      }, 500); // Half of the 1s transition
    }, 3000);

    return () => clearInterval(interval);
  }, [lyricsTranslations.length]);

  // Cycle through AI images every 4 seconds with crossfade
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAiIndex((prev) => (prev + 1) % aiImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [aiImages.length]);

  // Check WebGL availability
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
        
        if (!gl || !(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
          console.log('❌ WebGL not available');
          setWebglAvailable(false);
          return;
        }
        
        // Additional check for shader precision (the failing call)
        try {
          const result = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
          if (!result) {
            console.log('❌ WebGL shader precision not available');
            setWebglAvailable(false);
            return;
          }
          console.log('✅ WebGL fully available');
          setWebglAvailable(true);
        } catch (e) {
          console.log('❌ WebGL available but shader precision failed');
          setWebglAvailable(false);
        }
      } catch (e) {
        console.log('❌ WebGL check failed:', e);
        setWebglAvailable(false);
      }
    };
    
    // Run check on next tick
    setTimeout(checkWebGL, 0);
  }, []);

  // Auto-enable microphone on mount for background visualization
  useEffect(() => {
    if (webglAvailable) {
      enableMic();
    }
  }, [enableMic, webglAvailable]);

  // Catch any unhandled WebGL errors and show fallback
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && (event.message.includes('gl.getShader') || event.message.includes('WebGL'))) {
        console.error('WebGL error caught, switching to fallback:', event.message);
        setWebglAvailable(false);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Force body to be black and allow scrolling
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

  return (
    <div className={styles.landingPage}>
      {/* Capture referral code from URL */}
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>

      {/* Background Visualization or Fallback Image */}
      <div className={styles.backgroundViz}>
        {webglAvailable === null ? (
          // Still checking WebGL availability
          <div style={{ background: '#000' }} />
        ) : webglAvailable ? (
          // WebGL available - show 3D viz
          <FFTSpectrumVisualization
            micData={micData}
            lyrics={null}
            currentTimeMs={0}
            isPlaying={true}
            fps={fps}
          />
        ) : (
          // WebGL not available - show fallback image
          <img 
            src="/viz-thumbnails/fftspectrum.webp" 
            alt="FFT Visualization" 
            className={styles.fallbackImage}
          />
        )}
      </div>

      <main className={styles.landingMain}>
        {/* Header with Logo and Icon */}
        <header className={styles.header}>
          <div className={styles.logoWrapper}>
            <img src="/icon" alt="Syns6 Icon" className={styles.favicon} />
            {/* <Syns6Logo /> */}
          </div>
        </header>

        {/* Hero Section - Title/Subtitle over visualization */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Karaoke, redefined.</h1>
          <p className={styles.heroSubtitle}>
          By day, your home. By night,<br className={styles.desktopBreak}/>the sickest club in the world.<br className={styles.mobileBreak}/> And <b>you</b> own it.
            {/* <br />
            A neon-soaked, bass-pounding private club. */}
          </p>
          <div className={styles.ctaContainer}>
            <button 
              onClick={() => signIn('spotify', { callbackUrl: '/waitlist' })} 
              className={styles.ctaButton}
            >
              Join the waitlist
            </button>
            <a href="https://www.producthunt.com/products/syns6?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-syns6" target="_blank" rel="noopener noreferrer">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1042868&theme=light&t=1764195048977" alt="syns6 - Karaoke&#0046;&#0032;Redefined&#0046; | Product Hunt" style={{width: '250px', height: '54px'}} width="250" height="54" />
            </a>
          </div>
        </section>

        {/* Social Links */}
        <section className={styles.socialLinks}>
          <a href="https://www.instagram.com/_syns6_/" className={styles.socialLink} aria-label="Instagram">
            Instagram
          </a>
          <a href="https://www.tiktok.com/@_syns6_" className={styles.socialLink} aria-label="TikTok">
            TikTok
          </a>
          <a href="https://x.com/_syns6_" className={styles.socialLink} aria-label="Twitter">
            Twitter
          </a>
          
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Features that slap</h2>
          
          <div className={styles.featureGrid}>
            <div className={styles.vizMasonrySection}>
              <div className={styles.masonryGrid}>
                {vizImages.slice(0, 4).map((img, index) => {
                  const videoSrc = `/viz-thumbnails/${img.replace('.webp', '.webm')}`;
                  return (
                    <div key={index} className={styles.masonryItem}>
                      <ScrollVideo 
                        src={videoSrc}
                        alt={`Visualization ${index + 1}`}
                        className={styles.masonryImage}
                      />
                    </div>
                  );
                })}
                <div className={styles.masonryTextItem}>
                  <h3 className={styles.featureTitle}>Funmaxxing visualizations</h3>
                  <p className={styles.featureDescription}>
                    Your voice <i style={{fontFamily: 'Baskerville, Georgia, serif', fontStyle: 'italic'}}>&</i> the beat: live 3D visuals that go so stupid they need a passport.
                  </p>
                </div>
                {vizImages.slice(4).map((img, index) => {
                  const videoSrc = `/viz-thumbnails/${img.replace('.webp', '.webm')}`;
                  return (
                    <div key={index + 4} className={styles.masonryItem}>
                      <ScrollVideo 
                        src={videoSrc}
                        alt={`Visualization ${index + 5}`}
                        className={styles.masonryImage}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureImageContainer}>
                <div className={styles.imageStack}>
                  {lyricsImages.map((img, index) => (
                    <img 
                      key={index}
                      src={`/lyrics/${img}`}
                      alt="Lyrics for all!" 
                      className={`${styles.featureImage} ${styles.lyrics} ${styles.stackedImage}`}
                      style={{ opacity: currentLyricsIndex === index ? 1 : 0 }}
                    />
                  ))}
                </div>
                <div className={styles.imageDots}>
                  {lyricsImages.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.imageDot} ${currentLyricsIndex === index ? styles.active : ''}`}
                      onClick={() => setCurrentLyricsIndex(index)}
                      aria-label={`View lyrics example ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.featureText}>
                <div className={styles.titleContainer}>
                  <h3 
                    className={styles.featureTitle}
                    style={{ 
                      opacity: translationFading ? 0 : 1,
                      transition: 'opacity 1s ease-in-out'
                    }}
                  >
                    {lyricsTranslations[currentTranslationIndex].text}
                  </h3>
                </div>
                <p className={styles.featureDescription}>
                  True Norwegian Black Metal?<br />
                  Memphis Hip Hop circa '95? Onkyokei Japanoise?
                  <br />
                  Yes, we can.
                  <br /><br />
                  No more <i>Mamma Mia</i>. Real lyrics, real karaoke. 
                </p>
              </div>
            </div>

            <div className={`${styles.featureCard}`}>
              <div className={styles.imageStack}>
                {aiImages.map((img, index) => (
                  <img 
                    key={index}
                    src={`/ai/${img}`}
                    alt="Create with AI" 
                    className={`${styles.featureImage} ${styles.ai} ${styles.stackedImage}`}
                    style={{ opacity: currentAiIndex === index ? 1 : 0 }}
                  />
                ))}
              </div>
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>
                  Create with <span className={styles.aiBadge}><span className={styles.sparkles}>✦</span>AI</span>
                </h3>
                <p className={styles.featureDescription}>
                Your club, your vibe.<br />Create your own visualizations, powered by AI. 
                </p>
              </div>
            </div>

            <div className={styles.featureCardsGrid}>
              <div className={styles.featureCardVertical}>
                
                <div className={styles.featureTextVertical}>
                  <h3 className={styles.featureTitleVertical}>Viewer mode</h3>
                  <p className={styles.featureDescriptionVertical}>
                    Choose your VIPs. Share your karaoke session - friends can join and sing along.
                  </p>
                </div>
              </div>

              <div className={styles.featureCardVertical}>
                
                <div className={styles.featureTextVertical}>
                  <h3 className={styles.featureTitleVertical}>Hue integration</h3>
                  <p className={styles.featureDescriptionVertical}>
                    Sync your smart lights to the beat - turn your room into a concert venue with Hue integration and many other peripherals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Instagram Videos Section */}
        <section className={styles.instagramSection}>
          <h2 className={styles.sectionTitle}>See it in action</h2>
          <p className={styles.sectionSubtitle}>
            Follow us on Instagram for the latest updates
          </p>
          <a 
            href="https://www.instagram.com/_syns6_/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.instagramLink}
          >
            @_syns6_
          </a>
          <div className={styles.instagramGrid}>
            {/* Instagram Embed - Replace the URLs with your actual Instagram post/reel URLs */}
            <div className={styles.instagramEmbed}>
              <InstagramEmbed 
                
                url="https://www.instagram.com/reel/DRft3ZmCPE9/" 
                width={328}
              />
            </div>
            <div className={styles.instagramEmbed}>
              <InstagramEmbed 
                url="https://www.instagram.com/reel/DRdhNlxiKuS/" 
                width={328}
              />
            </div>
            <div className={styles.instagramEmbed}>
              <InstagramEmbed 
                url="https://www.instagram.com/reel/DRcfnrkCJFy/" 
                width={328}
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        {/* <section className={styles.testimonials}>
          <h2 className={styles.sectionTitle}>What people are saying</h2>
          
          <div className={styles.testimonialGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialVideo}>
                <div className={styles.videoPlaceholder}>🎤 Video</div>
              </div>
              <p className={styles.testimonialQuote}>
                "Best karaoke experience ever! The visualizations are insane."
              </p>
              <p className={styles.testimonialAuthor}>- Alex</p>
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.testimonialVideo}>
                <div className={styles.videoPlaceholder}>🎵 Video</div>
              </div>
              <p className={styles.testimonialQuote}>
                "Finally, I can sing metal without butchering the lyrics!"
              </p>
              <p className={styles.testimonialAuthor}>- Sam</p>
            </div>
            
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialVideo}>
                <div className={styles.videoPlaceholder}>🎸 Video</div>
              </div>
              <p className={styles.testimonialQuote}>
                "The AI visualization creator is a game changer."
              </p>
              <p className={styles.testimonialAuthor}>- Jordan</p>
            </div>
          </div>
        </section> */}

        {/* Pricing Section */}
        <section className={styles.pricing}>
          {/* <h2 className={styles.sectionTitle}>Simple Pricing</h2>
          
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <h3 className={styles.pricingTier}>Free</h3>
              <p className={styles.pricingPrice}>$0</p>
              <ul className={styles.pricingFeatures}>
                <li>✓ All visualizations</li>
                <li>✓ Lyrics for all songs</li>
                <li>✓ Basic features</li>
              </ul>
            </div>

            <div className={`${styles.pricingCard} ${styles.featured}`}>
              <div className={styles.popularBadge}>Popular</div>
              <h3 className={styles.pricingTier}>Pro</h3>
              <p className={styles.pricingPrice}>$9.99<span>/month</span></p>
              <ul className={styles.pricingFeatures}>
                <li>✓ Everything in Free</li>
                <li>✓ AI visualization creator</li>
                <li>✓ Hue integration</li>
                <li>✓ Viewer mode</li>
                <li>✓ Priority support</li>
              </ul>
        </div>
          </div> */}

          <button 
            onClick={() => signIn('spotify', { callbackUrl: '/waitlist' })} 
            className={styles.ctaButton}
          >
            Join the waitlist
          </button>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>© syns6. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
