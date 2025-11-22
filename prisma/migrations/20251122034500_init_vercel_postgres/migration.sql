-- CreateTable
CREATE TABLE "UserCredit" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "membershipPlan" TEXT,
    "membershipExpiresAt" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "age" INTEGER,
    "education" TEXT,

    CONSTRAINT "UserCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCredit_email_key" ON "UserCredit"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_sessionId_key" ON "CheckoutSession"("sessionId");
