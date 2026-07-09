-- CreateEnum
CREATE TYPE "DashboardType" AS ENUM ('EXECUTIVE', 'CUSTOMER', 'PRODUCT', 'INVENTORY');

-- CreateTable
CREATE TABLE "saved_dashboard_views" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dashboardType" "DashboardType" NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_dashboard_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_dashboard_views_organizationId_dashboardType_idx" ON "saved_dashboard_views"("organizationId", "dashboardType");

-- AddForeignKey
ALTER TABLE "saved_dashboard_views" ADD CONSTRAINT "saved_dashboard_views_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_dashboard_views" ADD CONSTRAINT "saved_dashboard_views_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
