"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { UrlMeta } from "@prisma/client";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import { DATE_DIMENSION_ENUMS } from "@/lib/enums";
import { fetcher } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";

import { DailyPVUVChart } from "../meta-chart";

interface Props {
  user: Pick<User, "id" | "name" | "role">;
}

export default function SiteAnalytics({ user }: Props) {
  const t = useTranslations("Components");
  const [timeRange, setTimeRange] = useState("7d");

  const { data, isLoading } = useSWR<UrlMeta[]>(
    `/api/url/stats?range=${timeRange}`,
    fetcher,
    { focusThrottleInterval: 30000 },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-[260px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyPlaceholder className="shadow-none">
        <EmptyPlaceholder.Title>{t("No Visits")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("You don't have any visits yet in")}{" "}
          {t(
            DATE_DIMENSION_ENUMS.find((e) => e.value === timeRange)?.label ||
              "",
          )}
          .
          <Select
            onValueChange={(value: string) => setTimeRange(value)}
            name="time range"
            defaultValue={timeRange}
          >
            <SelectTrigger className="mt-4 w-full shadow-inner">
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent>
              {DATE_DIMENSION_ENUMS.map((e, i) => (
                <div key={e.value}>
                  <SelectItem value={e.value}>
                    <span className="flex items-center gap-1">{t(e.label)}</span>
                  </SelectItem>
                  {i % 2 === 0 && i !== DATE_DIMENSION_ENUMS.length - 1 && (
                    <SelectSeparator />
                  )}
                </div>
              ))}
            </SelectContent>
          </Select>
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  return (
    <div className="animate-fade-down">
      <DailyPVUVChart
        data={data}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        user={{ id: user.id, name: user.name }}
      />
    </div>
  );
}
