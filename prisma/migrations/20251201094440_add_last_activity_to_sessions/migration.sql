-- AlterTable
ALTER TABLE "shared_sessions" ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "lyricsColor" TEXT DEFAULT '#ff0',
ADD COLUMN     "lyricsFont" TEXT DEFAULT 'Poppins';
