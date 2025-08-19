-- CreateTable
CREATE TABLE "public"."Domain" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "blockTime" INTEGER,
    "owner" TEXT,
    "fee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_signature_key" ON "public"."Domain"("signature");

-- CreateIndex
CREATE INDEX "Domain_timestamp_idx" ON "public"."Domain"("timestamp");

-- CreateIndex
CREATE INDEX "Domain_blockTime_idx" ON "public"."Domain"("blockTime");
