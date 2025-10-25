-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jdText" TEXT,
    "resumeText" TEXT,
    "extraText" TEXT,
    "terms" TEXT NOT NULL DEFAULT '[]',
    "resumeJson" TEXT,
    "letterJson" TEXT,
    "atsScore" INTEGER
);

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");
