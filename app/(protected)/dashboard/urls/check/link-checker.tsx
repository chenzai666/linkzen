"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { ShortUrlFormData } from "@/lib/dto/short-urls";
import { fetcher, removeUrlPrefix } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import UserUrlMetaInfo from "@/app/(protected)/dashboard/urls/meta";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";
import Link from "next/link";

interface CheckResult {
  id: string;
  url: string;
  target: string;
  status: number;
  ok: boolean;
  duration: number;
  error?: string;
  checkedAt?: string;
}

interface LinkCheckerProps {
  user: { id: string; role: string };
  action: string;
}

function ResultBadge({ result }: { result: CheckResult }) {
  if (result.error === "timeout") {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-400 text-yellow-600">
        <Icons.warning className="size-3" />
        超时
      </Badge>
    );
  }
  if (result.error === "blocked") {
    return (
      <Badge variant="outline" className="border-gray-400 text-gray-500">
        已屏蔽
      </Badge>
    );
  }
  if (result.error === "network_error" || result.status === 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Icons.unplug className="size-3" />
        网络错误
      </Badge>
    );
  }
  if (result.ok) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <Icons.check className="size-3" />
        正常
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <Icons.close className="size-3" />
      异常
    </Badge>
  );
}

export default function LinkChecker({ user, action }: LinkCheckerProps) {
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const [activeTab, setActiveTab] = useState("failed");
  const [timeout, setTimeout] = useState(6);
  const [batchSize, setBatchSize] = useState(6);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const stopRef = useRef(false);

  const { data, isLoading } = useSWR<{ total: number; list: ShortUrlFormData[] }>(
    `${action}?page=1&size=500`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const allLinks = data?.list ?? [];

  const stats = {
    total: allLinks.length,
    checked: Object.keys(results).length,
    ok: Object.values(results).filter((r) => r.ok).length,
    failed: Object.values(results).filter((r) => !r.ok && !r.error).length,
    networkError: Object.values(results).filter(
      (r) => r.error === "network_error" || (r.status === 0 && r.error !== "blocked" && r.error !== "timeout"),
    ).length,
  };

  const handleStart = async () => {
    if (allLinks.length === 0) return;
    stopRef.current = false;
    setChecking(true);
    setResults({});
    setProgress({ checked: 0, total: allLinks.length });

    const ids = allLinks.map((u) => u.id!).filter(Boolean);
    let checked = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      if (stopRef.current) break;
      const batch = ids.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/url/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch, timeout }),
        });
        if (res.ok) {
          const batchResults: Record<string, CheckResult> = await res.json();
          setResults((prev) => ({ ...prev, ...batchResults }));
        }
      } catch {
        // 单批失败不中断整体检测
      }
      checked += batch.length;
      setProgress({ checked, total: allLinks.length });
    }

    setChecking(false);
    if (!stopRef.current) {
      setActiveTab("failed");
      toast.success("检测完成");
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    setChecking(false);
    toast.info("已停止检测");
  };

  const handleReset = () => {
    setResults({});
    setProgress({ checked: 0, total: 0 });
    setActiveTab("failed");
  };

  const handleExportCSV = () => {
    const failedResults = Object.values(results).filter((r) => !r.ok);
    if (failedResults.length === 0) return;
    const header = "slug,url,status,result,error";
    const rows = failedResults.map((r) => {
      const slug = removeUrlPrefix(r.url);
      const result = r.error === "network_error" || r.status === 0 ? "网络错误" : "异常";
      return `"${slug}","${r.target}",${r.status},"${result}","${r.error || ""}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "failed-links.csv";
    link.click();
  };

  // 计算所有出现的异常状态码（用于 Tab）
  const statusGroups = Object.values(results).reduce<Record<string, CheckResult[]>>(
    (acc, r) => {
      if (!r.ok && r.status > 0) {
        const key = String(r.status);
        acc[key] = acc[key] || [];
        acc[key].push(r);
      }
      return acc;
    },
    {},
  );

  const getFilteredResults = (): CheckResult[] => {
    const all = Object.values(results);
    if (activeTab === "all") return all;
    if (activeTab === "failed") return all.filter((r) => !r.ok);
    return all.filter((r) => String(r.status) === activeTab);
  };

  const filteredResults = getFilteredResults();
  const progressPct = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 标题 + 操作按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">链接检测</h1>
          <p className="text-sm text-muted-foreground">检测短链目标 URL 的可访问状态</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!checking ? (
            <Button size="sm" onClick={handleStart} disabled={isLoading || allLinks.length === 0}>
              <Icons.shieldCheck className="mr-2 size-4" />
              开始检测
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={handleStop}>
              <Icons.close className="mr-2 size-4" />
              停止
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleReset} disabled={checking}>
            <Icons.refreshCw className="mr-2 size-4" />
            重置
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={checking || stats.failed + stats.networkError === 0}
          >
            <Icons.download className="mr-2 size-4" />
            导出异常
          </Button>
        </div>
      </div>

      {/* 配置 */}
      <div className="flex flex-wrap gap-4 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-sm">超时（秒）</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={timeout}
            onChange={(e) => setTimeout(Math.min(30, Math.max(1, Number(e.target.value))))}
            className="w-20"
            disabled={checking}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-sm">批量大小</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={batchSize}
            onChange={(e) => setBatchSize(Math.min(10, Math.max(1, Number(e.target.value))))}
            className="w-20"
            disabled={checking}
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "总数", value: stats.total, color: "" },
          { label: "已检测", value: stats.checked, color: "text-blue-600" },
          { label: "正常", value: stats.ok, color: "text-green-600" },
          { label: "异常", value: stats.failed + (stats.networkError > 0 ? 0 : 0), color: "text-red-600" },
          { label: "网络错误", value: stats.networkError, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-md border p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 进度条 */}
      {progress.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{checking ? "检测中..." : "检测完成"}</span>
            <span>{progress.checked} / {progress.total} ({progressPct}%)</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {/* 结果区域 */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="failed">
                异常 {stats.failed + stats.networkError > 0 && `(${stats.failed + stats.networkError})`}
              </TabsTrigger>
              {Object.keys(statusGroups).map((code) => (
                <TabsTrigger key={code} value={code}>
                  {code} ({statusGroups[code].length})
                </TabsTrigger>
              ))}
              <TabsTrigger value="all">全部 ({stats.checked})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">短链</TableHead>
                  <TableHead>目标 URL</TableHead>
                  <TableHead className="w-[70px] text-center">状态码</TableHead>
                  <TableHead className="w-[110px] text-center">结果</TableHead>
                  <TableHead className="w-[80px] text-center">耗时</TableHead>
                  <TableHead className="hidden sm:table-cell">错误</TableHead>
                  <TableHead className="w-[120px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {activeTab === "failed" ? "暂无异常链接 🎉" : "暂无数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[160px] truncate font-mono text-sm">
                        {removeUrlPrefix(r.url)}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-sm text-muted-foreground"
                        title={r.target}
                      >
                        {r.target}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {r.status > 0 ? r.status : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <ResultBadge result={r} />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {r.duration > 0 ? `${r.duration}ms` : "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {r.error === "timeout"
                          ? "请求超时"
                          : r.error === "network_error"
                            ? "网络连接失败"
                            : r.error === "blocked"
                              ? "私有地址已屏蔽"
                              : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={r.target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Icons.outLink className="size-3" />
                            原链接
                          </Link>
                          <button
                            onClick={() => { setStatsId(r.id); setShowStats(true); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Icons.lineChart className="size-3" />
                            详情
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 未开始时的链接列表 */}
      {Object.keys(results).length === 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">短链</TableHead>
                <TableHead>目标 URL</TableHead>
                <TableHead className="w-[80px] text-center">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                : allLinks.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        暂无短链数据
                      </TableCell>
                    </TableRow>
                  )
                  : allLinks.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {removeUrlPrefix(item.url)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={item.target}>
                        {item.target}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">待检测</span>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-right text-xs text-muted-foreground">
        共 {data?.total ?? allLinks.length} 条链接
      </p>

      <Modal showModal={showStats} setShowModal={setShowStats}>
        <div className="p-4">
          <h3 className="mb-4 text-base font-semibold">访问统计</h3>
          {statsId && (
            <UserUrlMetaInfo
              user={{ id: user.id, name: "" }}
              action="/api/url/meta"
              urlId={statsId}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
