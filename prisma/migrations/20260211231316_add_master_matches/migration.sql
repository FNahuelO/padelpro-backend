-- CreateEnum
CREATE TYPE "MasterMatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "master_participants" ADD COLUMN     "eliminated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "master_matches" (
    "id" TEXT NOT NULL,
    "masterEventId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "teamAScore" INTEGER,
    "teamBScore" INTEGER,
    "winnerId" TEXT,
    "status" "MasterMatchStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_matches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "master_participants" ADD CONSTRAINT "master_participants_userId1_fkey" FOREIGN KEY ("userId1") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_participants" ADD CONSTRAINT "master_participants_userId2_fkey" FOREIGN KEY ("userId2") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_matches" ADD CONSTRAINT "master_matches_masterEventId_fkey" FOREIGN KEY ("masterEventId") REFERENCES "master_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_matches" ADD CONSTRAINT "master_matches_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "master_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_matches" ADD CONSTRAINT "master_matches_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "master_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
