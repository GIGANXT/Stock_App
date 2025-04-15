-- CreateTable
CREATE TABLE "MCXAluminium" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "prices" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MCXAluminium_pkey" PRIMARY KEY ("id")
);
