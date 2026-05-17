"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR from "swr";

import { ShortUrlFormData } from "@/lib/dto/short-urls";
import { fetcher, removeUrlPrefix } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/components/shared/icons";

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

function StatusBadge({ result }: { result: CheckResult }) {
  if (result.error === "timeout") {
    return <Badge variant="outline" className="border-yellow-400 text-yellow-600">超时</Badge>;
  }
  if (result.error === "blocked") {
    return <Badge variant="outline" className="border-gray-400 text-gray-500">已屏蔽</Badge>;
  }
  if (result.error) {
    return <Badge variant="destructive">连接失败</Badge>;
  }
  if (result.ok) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        {result.status} OK
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      {result.status || "错误"}
    </Badge>
  );
}

export default function LinkChecker({ user, action }: LinkCheckerProps) {
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const { data, isLoading } = useSWR<{ total: number; list: ShortUrlFormData[] }>(
    `${action}?page=1&size=100`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const checkIds = async (ids: string[]) => {
    const res = await fetch("/api/url/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("检测请求失败");
    return res.json() as Promise<Record<string, CheckResult>>;
  };

  const handleCheckOne = async (id: string) => {
    setChecking((prev) => new Set(prev).add(id));
    try {
      const results = await checkIds([id]);
      setCheckResults((prev) => ({ ...prev, ...results }));
    } catch {
      toast.error("检测失败，请重试");
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    const ids = data?.list?.map((u) => u.id!).filter(Boolean) ?? [];
    if (ids.length === 0) return;
    setIsCheckingAll(true);

    // 每次最多检测 10 个，分批进行
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) {
      batches.push(ids.slice(i, i + 10));
    }

    try {
      for (const batch of batches) {
        const results = await checkIds(batch);
        setCheckResults((prev) => ({ ...prev, ...results }));
      }
      toast.success("全部检测完成");
    } catch {
      toast.error("检测失败，请重试");
    } finally {
      setIsCheckingAll(false);
    }
  };

  const list = data?.list ?? [];
  const checkedCount = Object.keys(checkResults).length;
  const okCount = Object.values(checkResults).filter((r) => r.ok).length;
  const failCount = checkedCount - okCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">链接检测</h1>
          <p className="text-sm text-muted-foreground">
            检测短链目标 URL 的可访问状态
          </p>
        </div>
        <div className="flex items-center gap-3">
          {checkedCount > 0 && (
            <div className="flex gap-2 text-sm">
              <Badge variant="outline" className="border-green-500 text-green-600">
                正常 {okCount}
              </Badge>
              {failCount > 0 && (
                <Badge variant="destructive">异常 {failCount}</Badge>
              )}
            </div>
          )}
          <Button
            onClick={handleCheckAll}
            disabled={isCheckingAll || isLoading || list.length === 0}
            size="sm"
          >
            {isCheckingAll ? (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            ) : (
              <Icons.shieldCheck className="mr-2 size-4" />
            )}
            检测全部
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">短链</TableHead>
              <TableHead>目标 URL</TableHead>
              <TableHead className="w-[100px] text-center">状态</TableHead>
              <TableHead className="w-[80px] text-center">耗时</TableHead>
              <TableHead className="w-[80px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-14 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  暂无短链数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((item) => {
                const result = checkResults[item.id!];
                const isChecking = checking.has(item.id!);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {removeUrlPrefix(item.url)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={item.target}>
                      {item.target}
                    </TableCell>
                    <TableCell className="text-center">
                      {result ? (
                        <StatusBadge result={result} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {result?.duration != null && result.duration > 0
                        ? `${result.duration}ms`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isChecking || isCheckingAll}
                        onClick={() => handleCheckOne(item.id!)}
                      >
                        {isChecking ? (
                          <Icons.spinner className="size-3 animate-spin" />
                        ) : (
                          "检测"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {list.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          共 {data?.total ?? list.length} 条链接
        </p>
      )}
    </div>
  );
}
