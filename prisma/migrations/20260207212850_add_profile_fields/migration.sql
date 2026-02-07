-- AlterTable
ALTER TABLE "users" ADD COLUMN     "courtPosition" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "matchType" TEXT,
ADD COLUMN     "preferredHand" TEXT,
ADD COLUMN     "preferredPlayTime" TEXT,
ADD COLUMN     "sports" TEXT[] DEFAULT ARRAY['Pádel']::TEXT[];
