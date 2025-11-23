"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useFPS } from "@/hooks/useFPS";
import { track } from "@vercel/analytics";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null); // null = checking
  const { micData, enable: enableMic } = useMicrophoneAnalysis();
  const fps = useFPS();

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

  // Force body to be black and prevent scrolling
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.width = '100vw';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.height = '';
      document.body.style.width = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Thanks for subscribing! We'll keep you updated.");
        setEmail("");
        
        // Track email signup event
        track("email_signup", {
          email: email,
          timestamp: new Date().toISOString(),
        });
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

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
            onRowsChange={() => {}}
            isLandingPage={true}
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
        <div className={styles.landingContent}>
          
          
          <form onSubmit={handleSubmit} className={styles.emailForm}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={status === "loading"}
                className={styles.emailInput}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className={styles.submitButton}
              >
                {status === "loading" ? "..." : "FOMO"}
              </button>
            </div>
            
            {message && (
              <p className={`${styles.statusMessage} ${
                status === "success" ? styles.success : styles.error
              }`}>
                {message}
              </p>
            )}
          </form>

          
        </div>
      </main>
    </div>
  );
}
