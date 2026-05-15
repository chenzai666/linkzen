import { Suspense } from "react";
import { redirect } from "next/navigation";


import { getUserRecordCount } from "@/lib/dto/cloudflare-dns-record";
import { getUserShortUrlCount } from "@/lib/dto/short-urls";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardInfoCard } from "@/components/dashboard/dashboard-info-card";
import { ErrorBoundary } from "@/components/shared/error-boundary";

import UserRecordsList from "./records/record-list";
import UserUrlsList from "./urls/url-list";

export const metadata = constructMetadata({
  title: "Dashboard",
  description: "List and manage records.",
});

async function ShortUrlsCardSection({ userId }: { userId: string }) {
  const url_count = await getUserShortUrlCount(userId);
  return (
    <DashboardInfoCard
      userId={userId}
      title="Short URLs"
      total={url_count.total}
      monthTotal={url_count.month_total}
      limit={1000000}
      link="/dashboard/urls"
      icon="link"
    />
  );
}

async function DnsRecordsCardSection({ userId }: { userId: string }) {
  const record_count = await getUserRecordCount(userId);
  return (
    <DashboardInfoCard
      userId={userId}
      title="DNS Records"
      total={record_count.total}
      monthTotal={record_count.month_total}
      limit={1000000}
      link="/dashboard/records"
      icon="globeLock"
    />
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <ErrorBoundary fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <UserRecordsList
              user={{
                id: user.id,
                name: user.name || "",
                apiKey: user.apiKey || "",
                email: user.email || "",
                role: user.role as string,
              }}
              action="/api/record"
            />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <UserUrlsList
              user={{
                id: user.id,
                name: user.name || "",
                apiKey: user.apiKey || "",
                role: user.role as string,
              }}
              action="/api/url"
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
