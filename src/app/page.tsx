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
  const { micData, enable: enableMic } = useMicrophoneAnalysis();
  const fps = useFPS();

  // Auto-enable microphone on mount for background visualization
  useEffect(() => {
    enableMic();
  }, [enableMic]);

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
      {/* Background Visualization */}
      <div className={styles.backgroundViz}>
        <FFTSpectrumVisualization
          micData={micData}
          lyrics={null}
          currentTimeMs={0}
          isPlaying={true}
          fps={fps}
          onRowsChange={() => {}}
          isLandingPage={true}
        />
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
