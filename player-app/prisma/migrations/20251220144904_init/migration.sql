-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "referralCode" TEXT,
    "referredBy" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferredVisualization" TEXT DEFAULT 'spectrum',
    "visualizationIntensity" REAL DEFAULT 1.0,
    "lyricsFont" TEXT DEFAULT 'Poppins',
    "lyricsColor" TEXT DEFAULT '#ff0',
    "hueMaxIntensity" REAL DEFAULT 1.0,
    "hueBridgeIp" TEXT,
    "hueUsername" TEXT,
    "enableHueLights" BOOLEAN NOT NULL DEFAULT false,
    "audioSensitivity" REAL DEFAULT 1.0,
    "bassBoost" REAL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lyrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "duration" INTEGER,
    "instrumental" BOOLEAN NOT NULL DEFAULT false,
    "lyrics" TEXT,
    "source" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "lyrics_not_found" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "youtube_videos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "workingYoutubeId" TEXT,
    "verifiedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'api',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "play_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumName" TEXT,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "playedDuration" INTEGER,
    "visualizationType" TEXT,
    CONSTRAINT "play_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodStart" DATETIME NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" DATETIME,
    "trialStart" DATETIME,
    "trialEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "shared_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostUserId" TEXT,
    "trackId" TEXT,
    "trackName" TEXT,
    "artistName" TEXT,
    "albumArt" TEXT,
    "duration" INTEGER,
    "progress" INTEGER,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "queue" TEXT,
    "lyrics" TEXT,
    "visualizationType" TEXT,
    "visualizationMode" TEXT,
    "connectedClients" INTEGER NOT NULL DEFAULT 0,
    "lastUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_spotifyId_key" ON "lyrics"("spotifyId");

-- CreateIndex
CREATE INDEX "lyrics_spotifyId_idx" ON "lyrics"("spotifyId");

-- CreateIndex
CREATE INDEX "lyrics_artist_idx" ON "lyrics"("artist");

-- CreateIndex
CREATE INDEX "lyrics_title_idx" ON "lyrics"("title");

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_not_found_spotifyId_key" ON "lyrics_not_found"("spotifyId");

-- CreateIndex
CREATE INDEX "lyrics_not_found_title_artist_idx" ON "lyrics_not_found"("title", "artist");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_videos_spotifyId_key" ON "youtube_videos"("spotifyId");

-- CreateIndex
CREATE INDEX "youtube_videos_title_artist_idx" ON "youtube_videos"("title", "artist");

-- CreateIndex
CREATE INDEX "play_history_userId_playedAt_idx" ON "play_history"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "play_history_trackId_idx" ON "play_history"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_email_key" ON "email_subscribers"("email");

-- CreateIndex
CREATE INDEX "email_subscribers_email_idx" ON "email_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_events_eventId_key" ON "stripe_events"("eventId");

-- CreateIndex
CREATE INDEX "stripe_events_type_idx" ON "stripe_events"("type");

-- CreateIndex
CREATE INDEX "stripe_events_processed_idx" ON "stripe_events"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "shared_sessions_code_key" ON "shared_sessions"("code");

-- CreateIndex
CREATE INDEX "shared_sessions_code_idx" ON "shared_sessions"("code");

-- CreateIndex
CREATE INDEX "shared_sessions_expiresAt_idx" ON "shared_sessions"("expiresAt");
