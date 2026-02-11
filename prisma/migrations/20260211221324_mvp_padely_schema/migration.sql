-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PointsEventType" AS ENUM ('PLAYED_MATCH', 'VALLEY_BONUS', 'CLUB_BONUS');

-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'PROPOSED';

-- AlterTable
ALTER TABLE "availabilities" ADD COLUMN     "clubId" TEXT;

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "match_participants" ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED';

-- AlterTable
ALTER TABLE "ranking_snapshots" ADD COLUMN     "weekKey" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mainClubId" TEXT;

-- AlterTable
ALTER TABLE "weekly_points" ADD COLUMN     "weekKey" TEXT;

-- CreateTable
CREATE TABLE "points_events" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT,
    "matchId" TEXT,
    "type" "PointsEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "weekKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prizes" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekKey" TEXT,
    "category" TEXT,
    "position" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "points_events_playerId_weekKey_idx" ON "points_events"("playerId", "weekKey");

-- CreateIndex
CREATE INDEX "points_events_clubId_weekKey_idx" ON "points_events"("clubId", "weekKey");

-- CreateIndex
CREATE INDEX "ranking_snapshots_type_clubId_category_weekKey_idx" ON "ranking_snapshots"("type", "clubId", "category", "weekKey");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mainClubId_fkey" FOREIGN KEY ("mainClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_events" ADD CONSTRAINT "points_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_events" ADD CONSTRAINT "points_events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_events" ADD CONSTRAINT "points_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
