"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { InstagramEmbed } from "react-social-media-embed";
import styles from "./page.module.css";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useFPS } from "@/hooks/useFPS";
import Syns6Logo from "@/components/Syns6Logo";

export default function Home() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null); // null = checking
  const { micData, enable: enableMic } = useMicrophoneAnalysis();
  const fps = useFPS();
  const searchParams = useSearchParams();

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
      console.log('Referral code captured:', refCode);
    }
  }, [searchParams]);

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
            Your home, neon-soaked, bass-pounding karaoke revolution.
          </p>
          <button 
            onClick={() => signIn('spotify', { callbackUrl: '/waitlist' })} 
            className={styles.ctaButton}
          >
            Join the waitlist
          </button>
        </section>

        {/* Social Links */}
        <section className={styles.socialLinks}>
          <a href="#" className={styles.socialLink} aria-label="Instagram">
            Instagram
          </a>
          <a href="#" className={styles.socialLink} aria-label="TikTok">
            TikTok
          </a>
          <a href="#" className={styles.socialLink} aria-label="Twitter">
            Twitter
          </a>
          <a href="#" className={styles.socialLink} aria-label="Mae">
            Mae
          </a>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Features that slap</h2>
          
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <img 
                src="/viz-thumbnails/psychedelic.webp" 
                alt="Funmaxxing visualizations" 
                className={styles.featureImage}
              />
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>Funmaxxing visualizations</h3>
                <p className={styles.featureDescription}>
                  Immerse yourself in mind-bending 3D visuals that react to your voice and the music.
                </p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <img 
                src="/viz-thumbnails/fractal.webp" 
                alt="Lyrics for all songs" 
                className={styles.featureImage}
              />
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>Lyrics for all songs</h3>
                <p className={styles.featureDescription}>
                  Heavy metal fans rejoice - no more "mamma mia". Real lyrics, real karaoke.
                </p>
              </div>
            </div>

            <div className={`${styles.featureCard} ${styles.aiGlow}`}>
              <img 
                src="/viz-thumbnails/particles.webp" 
                alt="Create visualizations with AI" 
                className={styles.featureImage}
              />
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>Create visualizations with AI</h3>
                <p className={styles.featureDescription}>
                  Generate custom visualizations with AI - your imagination is the only limit
                </p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <img 
                src="/viz-thumbnails/waves.webp" 
                alt="Viewer mode for all to sing" 
                className={styles.featureImage}
              />
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>Viewer mode</h3>
                <p className={styles.featureDescription}>
                  Share your karaoke session - friends can join and sing along.
                </p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <img 
                src="/viz-thumbnails/animated.webp" 
                alt="Hue integration" 
                className={styles.featureImage}
              />
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>Hue integration</h3>
                <p className={styles.featureDescription}>
                  Sync your smart lights to the beat - turn your room into a concert venue with Hue integration and many other peripherals.
                </p>
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
          <p className={styles.instagramCTA}>
            Visit our profile for more →
          </p>
        </section>

        {/* Testimonials Section */}
        <section className={styles.testimonials}>
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
        </section>

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
            className={styles.ctaButtonLarge}
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
