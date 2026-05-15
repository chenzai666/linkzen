import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getUserRecordCount } from "@/lib/dto/cloudflare-dns-record";
import { getUserShortUrlCount } from "@/lib/dto/short-urls";
import { getAllUsersActiveApiKeyCount, getAllUsersCount } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveBarChart } from "@/components/charts/interactive-bar-chart";
import {
  DashboardInfoCard,
  UserInfoCard,
} from "@/components/dashboard/dashboard-info-card";
import { DashboardHeader } from "@/components/dashboard/header";
import { ErrorBoundary } from "@/components/shared/error-boundary";

import { RadialShapeChart } from "./api-key-active-chart";

export const metadata = constructMetadata({
  title: "Admin",
  description: "Admin page for only admin management.",
});

async function UserInfoCardSection({ userId }: { userId: string }) {
  const user_count = await getAllUsersCount();
  return (
    <UserInfoCard
      userId={userId}
      title="Users"
      count={user_count}
      link="/admin/users"
    />
  );
}

async function ShortUrlsCardSection({ userId }: { userId: string }) {
  const url_count = await getUserShortUrlCount(userId, 1, "ADMIN");
  return (
    <DashboardInfoCard
      userId={userId}
      title="Short URLs"
      total={url_count.total}
      monthTotal={url_count.month_total}
      limit={1000000}
      link="/admin/urls"
      icon="link"
    />
  );
}

async function DnsRecordsCardSection({ userId }: { userId: string }) {
  const record_count = await getUserRecordCount(userId, 1, "ADMIN");
  return (
    <DashboardInfoCard
      userId={userId}
      title="DNS Records"
      total={record_count.total}
      monthTotal={record_count.month_total}
      limit={1000000}
      link="/admin/records"
      icon="globeLock"
    />
  );
}

async function InteractiveBarChartSection() {
  return <InteractiveBarChart />;
}

async function RadialShapeChartSection() {
  const user_count = await getAllUsersCount();
  const user_api_key_count = await getAllUsersActiveApiKeyCount();
  return <RadialShapeChart totalUser={user_count} total={user_api_key_count} />;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.id || user.role !== "ADMIN") redirect("/login");

  return (
    <>
      <DashboardHeader heading="Admin Panel" text="" />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ErrorBoundary fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
              <UserInfoCardSection userId={user.id} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
              <ShortUrlsCardSection userId={user.id} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
              <DnsRecordsCardSection userId={user.id} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <ErrorBoundary fallback={<Skeleton className="h-[380px] w-full rounded-lg" />}>
          <Suspense fallback={<Skeleton className="h-[380px] w-full rounded-lg" />}>
            <InteractiveBarChartSection />
          </Suspense>
        </ErrorBoundary>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ErrorBoundary fallback={<Skeleton className="h-[320px] w-full rounded-lg" />}>
            <Suspense fallback={<Skeleton className="h-[320px] w-full rounded-lg" />}>
              <RadialShapeChartSection />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
