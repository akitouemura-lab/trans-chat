CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "inviteToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Room_inviteToken_key" ON "Room"("inviteToken");
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

INSERT INTO "Room" ("id", "name", "inviteToken", "createdAt", "updatedAt")
SELECT DISTINCT
    "roomId",
    "roomId",
    'legacy-' || gen_random_uuid()::text,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Message"
WHERE "roomId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "User" ("displayName", "createdAt", "updatedAt")
SELECT DISTINCT
    "userName",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Message"
WHERE "userName" IS NOT NULL
ON CONFLICT ("displayName") DO NOTHING;

ALTER TABLE "Message" ADD COLUMN "userId" TEXT;
ALTER TABLE "Message" ADD COLUMN "translationStatus" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "Message" ADD COLUMN "translationError" TEXT;
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Message"
SET "translationStatus" = CASE
    WHEN "translatedText" IS NULL THEN 'failed'
    ELSE 'completed'
END;

UPDATE "Message" AS message
SET "userId" = "User"."id"
FROM "User"
WHERE "User"."displayName" = message."userName";

ALTER TABLE "Message" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
