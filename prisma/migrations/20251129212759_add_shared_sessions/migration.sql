-- CreateTable
CREATE TABLE "shared_sessions" (
    "id" TEXT NOT NULL,
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
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_sessions_code_key" ON "shared_sessions"("code");

-- CreateIndex
CREATE INDEX "shared_sessions_code_idx" ON "shared_sessions"("code");

-- CreateIndex
CREATE INDEX "shared_sessions_expiresAt_idx" ON "shared_sessions"("expiresAt");
