"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { UrlMeta, User } from "@prisma/client";
import {
  VisSingleContainer,
  VisTooltip,
  VisTopoJSONMap,
} from "@unovis/react";
import { TopoJSONMap } from "@unovis/ts";
import { WorldMapTopoJSON } from "@unovis/ts/maps";
import { useTranslations } from "next-intl";
import { Flame, MousePointerClick, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  getBotName,
  getCountryName,
  getDeviceVendor,
  getEngineName,
  getLanguageName,
  getRegionName,
} from "@/lib/contries";
import { DATE_DIMENSION_ENUMS } from "@/lib/enums";
import { isLink, removeUrlPrefix } from "@/lib/utils";
import { useElementSize } from "@/hooks/use-element-size";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeAgoIntl } from "@/components/shared/time-ago";

function processUrlMeta(urlMetaArray: UrlMeta[]) {
  const dailyData: { [key: string]: { clicks: number; ips: Set<string> } } = {};

  urlMetaArray.forEach((meta) => {
    const createdDate = new Date(meta.createdAt).toISOString().split("T")[0];
    const updatedDate = new Date(meta.updatedAt).toISOString().split("T")[0];

    if (!dailyData[createdDate]) {
      dailyData[createdDate] = { clicks: 0, ips: new Set<string>() };
    }
    dailyData[createdDate].clicks += 1;
    dailyData[createdDate].ips.add(meta.ip);

    if (createdDate !== updatedDate) {
      if (!dailyData[updatedDate]) {
        dailyData[updatedDate] = { clicks: 0, ips: new Set<string>() };
      }
      dailyData[updatedDate].clicks += meta.click - 1;
      dailyData[updatedDate].ips.add(meta.ip);
    }
  });

  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      visits: data.clicks,
      visitors: data.ips.size,
    }));
}

function calculateCounters(data: UrlMeta[]) {
  const uniqueIps = new Set<string>();
  const uniqueReferrers = new Set<string>();
  let totalClicks = 0;

  data.forEach((log) => {
    uniqueIps.add(log.ip);
    totalClicks += log.click;
    if (log.referer) uniqueReferrers.add(log.referer);
  });

  return {
    visits: totalClicks,
    visitors: uniqueIps.size,
    referrers: uniqueReferrers.size,
  };
}

function calculateHeatmap(data: UrlMeta[], metric: "visits" | "visitors") {
  const grid: Record<string, { visits: number; visitors: Set<string> }> = {};

  data.forEach((item) => {
    const date = new Date(item.createdAt);
    // getDay(): 0=Sun,1=Mon..6=Sat → convert to ISO 1=Mon..7=Sun
    const rawDay = date.getDay();
    const weekday = rawDay === 0 ? 7 : rawDay;
    const hour = date.getHours();
    const key = `${weekday}-${hour}`;

    if (!grid[key]) {
      grid[key] = { visits: 0, visitors: new Set() };
    }
    grid[key].visits += item.click;
    grid[key].visitors.add(item.ip);
  });

  return grid;
}

interface Stat {
  dimension: string;
  clicks: number;
  percentage: string;
}

function generateStatsList(
  records: UrlMeta[],
  dimension: keyof UrlMeta,
): Stat[] {
  const dimensionCounts: { [key: string]: number } = {};
  let totalClicks = 0;

  records.forEach((record) => {
    const rawValue = record[dimension] || "Unknown";
    const dimValue =
      dimension === "country"
        ? getCountryName(rawValue as string)
        : dimension === "device"
          ? getDeviceVendor(rawValue as string)
          : dimension === "engine"
            ? getEngineName(rawValue as string)
            : dimension === "region"
              ? getRegionName(rawValue as string)
              : dimension === "lang"
                ? getLanguageName(rawValue as string)
                : dimension === "isBot"
                  ? getBotName(rawValue as boolean)
                  : rawValue;

    const click = record.click || 0;
    dimensionCounts[dimValue] = (dimensionCounts[dimValue] || 0) + click;
    totalClicks += click;
  });

  const statsList: Stat[] = Object.entries(dimensionCounts).map(
    ([dimValue, clicks]) => {
      const percentage = totalClicks > 0 ? (clicks / totalClicks) * 100 : 0;
      return {
        dimension: dimValue,
        clicks,
        percentage: percentage.toFixed(0) + "%",
      };
    },
  );

  statsList.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  return statsList;
}

// 热力图组件
function HeatmapChart({
  data,
  metric,
}: {
  data: UrlMeta[];
  metric: "visits" | "visitors";
}) {
  const grid = calculateHeatmap(data, metric);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 计算最大值用于归一化
  let maxValue = 0;
  for (const cell of Object.values(grid)) {
    const val = metric === "visits" ? cell.visits : cell.visitors.size;
    if (val > maxValue) maxValue = val;
  }

  function getCellValue(weekday: number, hour: number) {
    const key = `${weekday}-${hour}`;
    const cell = grid[key];
    if (!cell) return 0;
    return metric === "visits" ? cell.visits : cell.visitors.size;
  }

  function getCellOpacity(weekday: number, hour: number) {
    const value = getCellValue(weekday, hour);
    if (value === 0 || maxValue === 0) return 0.05;
    return Math.max(0.15, value / maxValue);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* 小时标签 */}
        <div className="mb-1 flex pl-10">
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {/* 热力图主体 */}
        {weekdays.map((day, idx) => (
          <div key={day} className="mb-1 flex items-center gap-1">
            <div className="w-9 shrink-0 text-right text-[10px] text-muted-foreground">
              {day}
            </div>
            {hours.map((h) => {
              const weekday = idx + 1;
              const val = getCellValue(weekday, h);
              const opacity = getCellOpacity(weekday, h);
              return (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${val}`}
                  className="h-5 flex-1 rounded-sm transition-opacity"
                  style={{
                    backgroundColor: `hsl(var(--chart-1) / ${opacity})`,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* 图例 */}
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0.05, 0.2, 0.4, 0.6, 0.85].map((o) => (
            <div
              key={o}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: `hsl(var(--chart-1) / ${o})` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

const trendChartConfig = {
  visits: { label: "Views", color: "hsl(var(--chart-1))" },
  visitors: { label: "Visitors", color: "hsl(var(--chart-2))" },
};

// 趋势图（recharts）
function TrendChart({ data }: { data: UrlMeta[] }) {
  const processed = processUrlMeta(data);

  return (
    <ChartContainer config={trendChartConfig} className="aspect-auto h-[200px] w-full">
      <AreaChart data={processed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trendVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
          }
        />
        <YAxis width={28} axisLine={false} tickLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[160px]"
              labelFormatter={(value) =>
                new Date(value).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="visits"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#trendVisits)"
        />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          fill="url(#trendVisitors)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function DailyPVUVChart({
  data,
  timeRange,
  setTimeRange,
  user,
}: {
  data: UrlMeta[];
  timeRange: string;
  setTimeRange: React.Dispatch<React.SetStateAction<string>>;
  user: Pick<User, "id" | "name">;
}) {
  const { ref: wrapperRef, width: wrapperWidth } = useElementSize();
  const [viewMode, setViewMode] = useState<"trend" | "heatmap">("trend");
  const [heatmapMetric, setHeatmapMetric] = useState<"visits" | "visitors">("visits");

  const t = useTranslations("Components");

  const counters = calculateCounters(data);

  const latestEntry = data[data.length - 1];
  const latestFrom = [
    latestEntry.city ? decodeURIComponent(latestEntry.city) : "",
    latestEntry.country ? `${getCountryName(latestEntry.country)}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const lastVisitorInfo = t.rich("last-visitor-info", {
    location: latestFrom,
    timeAgo: () => <TimeAgoIntl date={latestEntry.updatedAt} />,
  });

  // 计算国家点击次数（世界地图）
  const countryClicks: { [key: string]: number } = {};
  data.forEach((item) => {
    if (item.country) {
      countryClicks[item.country] = (countryClicks[item.country] || 0) + item.click;
    }
  });

  const areaData = Object.entries(countryClicks).map(([country]) => ({
    id: country,
  }));

  const triggers = {
    [TopoJSONMap.selectors.feature]: (d: any) =>
      `${getCountryName(d.id)} · ${countryClicks[d.id] || 0}`,
  };

  const refererStats = generateStatsList(data, "referer");
  const cityStats = generateStatsList(data, "city");
  const deviceStats = generateStatsList(data, "device");
  const browserStats = generateStatsList(data, "browser");
  const countryStats = generateStatsList(data, "country");
  const osStats = generateStatsList(data, "os");
  const cpuStats = generateStatsList(data, "cpu");
  const engineStats = generateStatsList(data, "engine");
  const languageStats = generateStatsList(data, "lang");
  const regionStats = generateStatsList(data, "region");
  const isBotStats = generateStatsList(data, "isBot");

  return (
    <div className="space-y-4">
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("Link Analytics")}</h3>
        <Select
          onValueChange={(value: string) => setTimeRange(value)}
          name="time range"
          defaultValue={timeRange}
        >
          <SelectTrigger className="w-36 shadow-inner">
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
      </div>

      {/* 计数卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Views")}</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {counters.visits.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Visits")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {counters.visitors.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Referrers")}</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {counters.referrers.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势/热力图切换 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "trend" | "heatmap")}>
            <TabsList>
              <TabsTrigger value="trend">{t("Trend")}</TabsTrigger>
              <TabsTrigger value="heatmap">{t("Weekly Trend")}</TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === "heatmap" && (
            <Select
              value={heatmapMetric}
              onValueChange={(v) => setHeatmapMetric(v as "visits" | "visitors")}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visits">{t("Views")}</SelectItem>
                <SelectItem value="visitors">{t("Visits")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Card>
          <CardContent className="p-4 pt-4">
            {viewMode === "trend" ? (
              <TrendChart data={data} />
            ) : (
              <HeatmapChart data={data} metric={heatmapMetric} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 世界地图 + 指标网格 */}
      <div ref={wrapperRef} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 世界地图 */}
        <div className="lg:col-span-8">
          <Card>
            <CardContent className="p-3">
              <VisSingleContainer
                data={{ areas: areaData }}
                width={wrapperWidth > 0 ? wrapperWidth * 0.65 : 400}
              >
                <VisTopoJSONMap topojson={WorldMapTopoJSON} />
                <VisTooltip triggers={triggers} />
              </VisSingleContainer>
            </CardContent>
          </Card>
        </div>

        {/* 地区分组 */}
        <div className="lg:col-span-4">
          <Tabs defaultValue="country">
            <TabsList>
              <TabsTrigger value="country">{t("Country")}</TabsTrigger>
              <TabsTrigger value="city">{t("City")}</TabsTrigger>
              <TabsTrigger value="region">{t("Region")}</TabsTrigger>
            </TabsList>
            <TabsContent value="country">
              {countryStats.length > 0 && <StatsList data={countryStats} title="Countries" />}
            </TabsContent>
            <TabsContent value="city">
              {cityStats.length > 0 && <StatsList data={cityStats} title="Cities" />}
            </TabsContent>
            <TabsContent value="region">
              {regionStats.length > 0 && <StatsList data={regionStats} title="Regions" />}
            </TabsContent>
          </Tabs>
        </div>

        {/* 来源 + 流量类型 */}
        <div className="lg:col-span-6">
          <Tabs defaultValue="referrer">
            <TabsList>
              <TabsTrigger value="referrer">{t("Referrers")}</TabsTrigger>
              <TabsTrigger value="isBot">{t("Traffic Type")}</TabsTrigger>
            </TabsList>
            <TabsContent value="referrer">
              {refererStats.length > 0 && <StatsList data={refererStats} title="Referrers" />}
            </TabsContent>
            <TabsContent value="isBot">
              {isBotStats.length > 0 && <StatsList data={isBotStats} title="Traffic Type" />}
            </TabsContent>
          </Tabs>
        </div>

        {/* 语言 + 时区 */}
        <div className="lg:col-span-6">
          <Tabs defaultValue="language">
            <TabsList>
              <TabsTrigger value="language">{t("Language")}</TabsTrigger>
              <TabsTrigger value="cpu">CPU</TabsTrigger>
            </TabsList>
            <TabsContent value="language">
              {languageStats.length > 0 && <StatsList data={languageStats} title="Languages" />}
            </TabsContent>
            <TabsContent value="cpu">
              {cpuStats.length > 0 && <StatsList data={cpuStats} title="CPU" />}
            </TabsContent>
          </Tabs>
        </div>

        {/* 设备 */}
        <div className="lg:col-span-6">
          <Tabs defaultValue="device">
            <TabsList>
              <TabsTrigger value="device">{t("Device")}</TabsTrigger>
              <TabsTrigger value="os">{t("OS")}</TabsTrigger>
            </TabsList>
            <TabsContent value="device">
              {deviceStats.length > 0 && <StatsList data={deviceStats} title="Devices" />}
            </TabsContent>
            <TabsContent value="os">
              {osStats.length > 0 && <StatsList data={osStats} title="OS" />}
            </TabsContent>
          </Tabs>
        </div>

        {/* 浏览器 */}
        <div className="lg:col-span-6">
          <Tabs defaultValue="browser">
            <TabsList>
              <TabsTrigger value="browser">{t("Browser")}</TabsTrigger>
              <TabsTrigger value="engine">{t("Engine")}</TabsTrigger>
            </TabsList>
            <TabsContent value="browser">
              {browserStats.length > 0 && <StatsList data={browserStats} title="Browsers" />}
            </TabsContent>
            <TabsContent value="engine">
              {engineStats.length > 0 && <StatsList data={engineStats} title="Engines" />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export function StatsList({ data, title }: { data: Stat[]; title: string }) {
  const [showAll, setShowAll] = useState(false);
  const displayedData = showAll ? data.slice(0, 50) : data.slice(0, 8);
  const t = useTranslations("Components");
  return (
    <div className="h-full rounded-lg border">
      <div className="flex items-center justify-between border-b px-5 py-2 text-xs font-medium text-muted-foreground">
        <span>{t("Name")}</span>
        <span>{t("Visitors")}</span>
      </div>
      <div
        className="scrollbar-hidden overflow-hidden overflow-y-auto px-4 pb-4 pt-2 transition-all duration-500 ease-in-out"
        style={{ maxHeight: "18rem" }}
      >
        {displayedData.map((ref) => (
          <div
            key={ref.dimension}
            className="group relative mt-1.5 h-7 w-full items-center rounded-lg bg-neutral-100 transition-all duration-100 hover:bg-blue-500/60 dark:bg-neutral-600"
          >
            <div className="flex h-7 items-center justify-between px-2 text-xs">
              {isLink(ref.dimension) ? (
                <Link
                  className="w-2/3 truncate font-medium hover:opacity-70 hover:after:content-['↗']"
                  href={ref.dimension}
                  target="_blank"
                >
                  {removeUrlPrefix(ref.dimension)}
                </Link>
              ) : (
                <p className="font-medium">
                  {decodeURIComponent(ref.dimension)}
                </p>
              )}
              <p>
                <span>{ref.clicks}</span>
                <span className="ml-1 hidden animate-fade-in transition-all duration-200 group-hover:inline-block">
                  ({ref.percentage})
                </span>
              </p>
            </div>
            <div
              className="absolute left-0 top-0 h-7 rounded-lg px-0.5 py-1 leading-none transition-all duration-300"
              style={{
                width: `${ref.percentage}`,
                background: `linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.7))`,
                opacity: parseFloat(ref.percentage) / 100 + 0.3,
              }}
            />
          </div>
        ))}
      </div>

      {data.length > 8 && (
        <div className="mb-3 mt-1 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="h-7 px-4 py-1 text-xs"
          >
            {showAll ? "Hide" : `Load More ${data.length - 8}+`}
          </Button>
        </div>
      )}
    </div>
  );
}
