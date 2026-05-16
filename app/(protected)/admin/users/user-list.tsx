"use client";

import { useMemo, useState } from "react";
import { User } from "@prisma/client";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { fetcher } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormType, UserForm } from "@/components/forms/user-form";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { PaginationWrapper } from "@/components/shared/pagination";
import { TimeAgoIntl } from "@/components/shared/time-ago";

export interface UrlListProps {
  user: Pick<User, "id" | "name">;
}

function TableColumnSekleton() {
  return (
    <TableRow className="grid grid-cols-4 items-center sm:grid-cols-8">
      <TableCell className="col-span-1 flex items-center">
        <Skeleton className="h-4 w-4" />
      </TableCell>
      <TableCell className="col-span-1">
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="col-span-1 sm:col-span-2">
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="col-span-1 hidden justify-center sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden justify-center sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden justify-center sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 flex justify-center">
        <Skeleton className="h-5 w-16" />
      </TableCell>
    </TableRow>
  );
}

export default function UsersList({ user }: UrlListProps) {
  const { isMobile } = useMediaQuery();
  const [formType, setFormType] = useState<FormType>("add");
  const [isShowForm, setShowForm] = useState(false);
  const [currentEditUser, setcurrentEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchParams, setSearchParams] = useState({ email: "", userName: "" });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const t = useTranslations("List");

  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR<{ total: number; list: User[] }>(
    `/api/user/admin?page=${currentPage}&size=${pageSize}&email=${searchParams.email}&userName=${searchParams.userName}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const handleRefresh = () => {
    mutate(
      `/api/user/admin?page=${currentPage}&size=${pageSize}&email=${searchParams.email}&userName=${searchParams.userName}`,
      undefined,
    );
  };

  const currentPageIds = useMemo(
    () => data?.list?.map((u) => u.id) ?? [],
    [data?.list],
  );
  const allPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    currentPageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) currentPageIds.forEach((id) => next.delete(id));
      else currentPageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/admin/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`已删除 ${result.deleted} 个用户`);
        setSelectedIds(new Set());
        handleRefresh();
      } else {
        toast.error("批量删除失败");
      }
    } catch {
      toast.error("批量删除失败");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center">
          <CardDescription className="text-balance text-lg font-bold">
            <span>{t("Total Users")}:</span>{" "}
            <span className="font-bold">{data && data.total}</span>
          </CardDescription>
          <div className="ml-auto flex items-center justify-end gap-3">
            <Button
              variant={"outline"}
              onClick={() => handleRefresh()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Icons.refreshCw className="size-4 animate-spin" />
              ) : (
                <Icons.refreshCw className="size-4" />
              )}
            </Button>
            <Button
              className="flex shrink-0 gap-1"
              variant="default"
              onClick={() => {
                setcurrentEditUser(null);
                setShowForm(false);
                setFormType("add");
                setShowForm(!isShowForm);
              }}
            >
              <Icons.add className="size-4" />
              <span className="hidden sm:inline">{t("Add User")}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex-row items-center gap-2 space-y-2 sm:flex sm:space-y-0">
            <div className="relative w-full">
              <Input
                className="h-8 text-xs md:text-xs"
                placeholder="搜索用户名..."
                value={searchKeyword}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchKeyword(val);
                  setSearchParams({ email: val, userName: val });
                }}
              />
              {searchKeyword && (
                <Button
                  className="absolute right-2 top-1/2 h-6 -translate-y-1/2 rounded-full px-1 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setSearchKeyword("");
                    setSearchParams({ email: "", userName: "" });
                  }}
                  variant={"ghost"}
                >
                  <Icons.close className="size-3" />
                </Button>
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-2 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
              <span className="text-sm text-muted-foreground">
                已选 {selectedIds.size} 个用户
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                取消选择
              </Button>
              <div className="ml-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Icons.spinner className="size-3 animate-spin" />
                      ) : (
                        <Icons.trash className="size-3" />
                      )}
                      删除所选
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认批量删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        即将删除 {selectedIds.size} 个用户，此操作不可撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleBatchDelete}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          <Table>
            <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground">
              <TableRow className="grid grid-cols-4 items-center sm:grid-cols-8">
                <TableHead className="col-span-1 flex items-center">
                  <Checkbox
                    checked={allPageSelected}
                    data-state={somePageSelected ? "indeterminate" : undefined}
                    onCheckedChange={handleSelectAll}
                    aria-label="全选当前页"
                  />
                </TableHead>
                <TableHead className="col-span-1 flex items-center font-bold">
                  {t("Name")}
                </TableHead>
                <TableHead className="col-span-1 flex items-center font-bold sm:col-span-2">
                  {t("Username")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center justify-center font-bold sm:flex">
                  {t("Role")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center justify-center font-bold sm:flex">
                  {t("Status")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center justify-center font-bold sm:flex">
                  {t("Join")}
                </TableHead>
                <TableHead className="col-span-1 flex items-center justify-center font-bold">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  <TableColumnSekleton />
                  <TableColumnSekleton />
                  <TableColumnSekleton />
                  <TableColumnSekleton />
                  <TableColumnSekleton />
                </>
              ) : data && data.list && data.list.length ? (
                data.list.map((u) => (
                  <TableRow
                    key={u.id}
                    className="grid animate-fade-in grid-cols-4 items-center animate-in sm:grid-cols-8"
                  >
                    <TableCell className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedIds.has(u.id)}
                        onCheckedChange={() => handleToggleSelect(u.id)}
                        aria-label="选择此行"
                      />
                    </TableCell>
                    <TableCell className="col-span-1 truncate">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger className="truncate">
                            {u.name || "未命名"}
                          </TooltipTrigger>
                          <TooltipContent>{u.name || "未命名"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="col-span-1 flex items-center gap-1 truncate sm:col-span-2">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger className="truncate">
                            {u.email}
                          </TooltipTrigger>
                          <TooltipContent>{u.email}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="col-span-1 hidden justify-center sm:flex">
                      <Badge className="text-xs" variant="outline">
                        {t(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="col-span-1 hidden justify-center sm:flex">
                      <Switch defaultChecked={u.active === 1} disabled />
                    </TableCell>
                    <TableCell className="col-span-1 hidden justify-center sm:flex">
                      <TimeAgoIntl date={u.updatedAt as Date} />
                    </TableCell>
                    <TableCell className="col-span-1 flex justify-center">
                      <Button
                        className="text-sm hover:bg-slate-100"
                        size="sm"
                        variant={"outline"}
                        onClick={() => {
                          setcurrentEditUser(u);
                          setShowForm(false);
                          setFormType("edit");
                          setShowForm(!isShowForm);
                        }}
                      >
                        <p className="text-nowrap">{t("Edit")}</p>
                        <PenLine className="ml-1 size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyPlaceholder className="shadow-none">
                  <EmptyPlaceholder.Icon name="users" />
                  <EmptyPlaceholder.Title>暂无用户</EmptyPlaceholder.Title>
                  <EmptyPlaceholder.Description>
                    还没有任何用户。
                  </EmptyPlaceholder.Description>
                </EmptyPlaceholder>
              )}
            </TableBody>
            {data && Math.ceil(data.total / pageSize) > 1 && (
              <PaginationWrapper
                layout={isMobile ? "right" : "split"}
                total={data.total}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            )}
          </Table>
        </CardContent>
      </Card>

      <Modal
        className="md:max-w-2xl"
        showModal={isShowForm}
        setShowModal={setShowForm}
      >
        <UserForm
          user={{ id: user.id, name: user.name || "" }}
          isShowForm={isShowForm}
          setShowForm={setShowForm}
          type={formType}
          initData={currentEditUser}
          onRefresh={handleRefresh}
        />
      </Modal>
    </>
  );
}
