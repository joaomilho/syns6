"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <h1>Loading...</h1>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.intro}>
            <h1>Spotify Authentication Demo</h1>
            <p>Connect your Spotify account to get started</p>
          </div>
          <div className={styles.ctas}>
            <button
              className={styles.primary}
              onClick={() => signIn("spotify")}
            >
              Sign in with Spotify
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Welcome, {session.user?.name || "User"}!</h1>
          <p>You are now authenticated with Spotify</p>
          {session.user?.email && <p>Email: {session.user.email}</p>}
        </div>

        <div className={styles.tokenInfo}>
          <h2>Session Information</h2>
          <div className={styles.tokenDetails}>
            <p>
              <strong>Access Token:</strong>{" "}
              {session.accessToken
                ? `${session.accessToken.substring(0, 20)}...`
                : "Not available"}
            </p>
            <p>
              <strong>Refresh Token:</strong>{" "}
              {session.refreshToken ? "Available" : "Not available"}
            </p>
            {session.expiresAt && (
              <p>
                <strong>Expires At:</strong>{" "}
                {new Date(session.expiresAt * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className={styles.scopes}>
          <h2>Granted Scopes</h2>
          <p>Your app has been granted all Spotify permissions including:</p>
          <ul>
            <li>Read and modify playback state</li>
            <li>Read and write playlists</li>
            <li>Manage library</li>
            <li>Access listening history</li>
            <li>Follow/unfollow artists and users</li>
            <li>Upload images</li>
            <li>Streaming access</li>
            <li>And all other available Spotify scopes</li>
          </ul>
        </div>

        <div className={styles.ctas}>
          <Link href="/player" className={styles.primary}>
            Open Spotify Player
          </Link>
          <button
            className={styles.secondary}
            onClick={() => signOut()}
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
