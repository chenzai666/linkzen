"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { User } from "@prisma/client";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { UserRecordFormData } from "@/lib/dto/cloudflare-dns-record";
import { TTL_ENUMS } from "@/lib/enums";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ClickableTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormType, RecordForm } from "@/components/forms/record-form";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Icons } from "@/components/shared/icons";
import { LinkInfoPreviewer } from "@/components/shared/link-previewer";
import { PaginationWrapper } from "@/components/shared/pagination";
import { TimeAgoIntl } from "@/components/shared/time-ago";

export interface RecordListProps {
  user: Pick<User, "id" | "name" | "apiKey" | "email" | "role">;
  action: string;
}

function TableColumnSekleton() {
  return (
    <TableRow className="grid grid-cols-4 items-center sm:grid-cols-10">
      <TableCell className="col-span-1 flex items-center">
        <Skeleton className="h-4 w-4" />
      </TableCell>
      <TableCell className="col-span-1">
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="col-span-1">
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="col-span-2 hidden sm:inline-block">
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:inline-block">
        <Skeleton className="h-5 w-16" />
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

export default function UserRecordsList({ user, action }: RecordListProps) {
  const { isMobile } = useMediaQuery();
  const [isShowForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>("add");
  const [currentEditRecord, setCurrentEditRecord] =
    useState<UserRecordFormData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const isAdmin = action.includes("/admin");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const t = useTranslations("List");

  const { mutate } = useSWRConfig();

  const { data, isLoading } = useSWR<{
    total: number;
    list: UserRecordFormData[];
  }>(`${action}?page=${currentPage}&size=${pageSize}`, fetcher, {
    revalidateOnFocus: false,
  });

  const handleRefresh = () => {
    mutate(`${action}?page=${currentPage}&size=${pageSize}`, undefined);
  };

  const currentPageIds = useMemo(
    () => data?.list?.map((r) => r.id ?? "") ?? [],
    [data?.list],
  );
  const allPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));
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
    const selectedRecords = data?.list?.filter((r) => selectedIds.has(r.id ?? "")) ?? [];
    const items = selectedRecords.map((r) => ({
      record_id: r.record_id,
      zone_id: r.zone_id,
      active: r.active,
      userId: r.userId,
    }));
    const apiPath = isAdmin ? "/api/record/admin/batch-delete" : "/api/record/batch-delete";
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await res.json();
      if (res.ok) {
        const msg = result.failed > 0
          ? `已删除 ${result.deleted} 条，失败 ${result.failed} 条`
          : `已删除 ${result.deleted} 条`;
        toast.success(msg);
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

  const handleChangeStatu = async (
    checked: boolean,
    record: UserRecordFormData,
    setChecked: (value: boolean) => void,
  ) => {
    const originalState = record.active === 1;
    setChecked(checked);

    const res = await fetch(`/api/record/update`, {
      method: "PUT",
      body: JSON.stringify({
        zone_id: record.zone_id,
        record_id: record.record_id,
        active: checked ? 1 : 0,
        target: record.name,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data === "Target is accessible!") {
        if (originalState) {
          setChecked(originalState);
        }
        toast.success(data);
      } else {
        setChecked(originalState);
        toast.warning(data);
      }
    } else {
      setChecked(originalState);
      toast.error("状态更新失败");
    }
  };

  return (
    <>
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center">
          {isAdmin ? (
            <CardDescription className="text-balance text-lg font-bold">
              <span>{t("Total Subdomains")}:</span>{" "}
              <span className="font-bold">{data && data.total}</span>
            </CardDescription>
          ) : (
            <div className="grid gap-2">
              <CardTitle>{t("Subdomain List")}</CardTitle>
              <CardDescription className="hidden text-balance sm:block">
                {t("Before using please read the")}
                <Link
                  target="_blank"
                  className="font-semibold text-yellow-600 after:content-['↗'] hover:underline"
                  href="/docs/dns-records#legitimacy-review"
                >
                  {t("legitimacy review")}
                </Link>
                . {t("See")}
                <Link
                  target="_blank"
                  className="text-blue-500 hover:underline"
                  href="/docs/examples/vercel"
                >
                  {t("examples")}
                </Link>
                {t("for more usage")}.
              </CardDescription>
            </div>
          )}
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
                setCurrentEditRecord(null);
                setShowForm(false);
                setFormType("add");
                setShowForm(!isShowForm);
              }}
            >
              <Icons.add className="size-4" />
              <span className="hidden sm:inline">{t("Add Record")}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="mb-2 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
              <span className="text-sm text-muted-foreground">
                已选 {selectedIds.size} 条记录
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
                        即将删除 {selectedIds.size} 条子域名记录，此操作不可撤销。
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
              <TableRow className="grid grid-cols-4 items-center sm:grid-cols-10">
                <TableHead className="col-span-1 flex items-center">
                  <Checkbox
                    checked={allPageSelected}
                    data-state={somePageSelected ? "indeterminate" : undefined}
                    onCheckedChange={handleSelectAll}
                    aria-label="全选当前页"
                  />
                </TableHead>
                <TableHead className="col-span-1 flex items-center font-bold">
                  {t("Type")}
                </TableHead>
                <TableHead className="col-span-1 flex items-center font-bold">
                  {t("Name")}
                </TableHead>
                <TableHead className="col-span-2 hidden items-center font-bold sm:flex">
                  {t("Content")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                  {t("TTL")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center justify-center font-bold sm:flex">
                  {t("Status")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                  {t("User")}
                </TableHead>
                <TableHead className="col-span-1 hidden items-center justify-center font-bold sm:flex">
                  {t("Updated")}
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
                data.list.map((record) => (
                  <TableRow
                    key={record.id}
                    className="grid animate-fade-in grid-cols-4 items-center animate-in sm:grid-cols-10"
                  >
                    <TableCell className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedIds.has(record.id ?? "")}
                        onCheckedChange={() => handleToggleSelect(record.id ?? "")}
                        aria-label="选择此行"
                      />
                    </TableCell>
                    <TableCell className="col-span-1">
                      <Badge className="text-xs" variant="outline">
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="col-span-1">
                      {[0, 1].includes(record.active) ? (
                        <LinkInfoPreviewer
                          apiKey={user.apiKey ?? ""}
                          url={"https://" + record.name}
                          formatUrl={record.name}
                        />
                      ) : (
                        record.name
                      )}
                    </TableCell>
                    <TableCell className="col-span-2 hidden truncate text-nowrap sm:inline-block">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger className="truncate">
                            {record.content}
                          </TooltipTrigger>
                          <TooltipContent>{record.content}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="col-span-1 hidden sm:inline-block">
                      {
                        TTL_ENUMS.find((ttl) => ttl.value === `${record.ttl}`)
                          ?.label
                      }
                    </TableCell>
                    <TableCell className="col-span-1 hidden items-center justify-center gap-1 sm:flex">
                      {[0, 1].includes(record.active) && (
                        <SwitchWrapper
                          record={record}
                          onChangeStatu={handleChangeStatu}
                        />
                      )}
                      {record.active === 2 && (
                        <Badge
                          className="text-nowrap rounded-md"
                          variant={"yellow"}
                        >
                          {t("Pending")}
                        </Badge>
                      )}
                      {record.active === 3 && (
                        <Badge
                          className="text-nowrap rounded-md"
                          variant={"outline"}
                        >
                          {t("Rejected")}
                        </Badge>
                      )}

                      {![1, 3].includes(record.active) && (
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger className="truncate">
                              <Icons.help className="size-4 cursor-pointer text-yellow-500 opacity-90" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {record.active === 0 && (
                                <ul className="list-disc px-3">
                                  <li>
                                    {t("The target is currently inaccessible")}.
                                  </li>
                                  <li>
                                    {t("Please check the target and try again")}
                                    .
                                  </li>
                                  <li>
                                    {t(
                                      "If the target is not activated within 3 days",
                                    )}
                                    , <br />
                                    {t("the administrator will")}{" "}
                                    <strong className="text-red-500">
                                      {t("delete this record")}
                                    </strong>
                                    .
                                  </li>
                                </ul>
                              )}
                              {record.active === 2 && (
                                <ul className="list-disc px-3">
                                  <li>
                                    {t(
                                      "The record is currently pending for admin approval",
                                    )}
                                    .
                                  </li>
                                </ul>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="col-span-1 hidden truncate sm:flex">
                      <ClickableTooltip
                        className="cursor-pointer truncate"
                        content={
                          <div className="px-2 py-1">
                            <p>{record.user.name}</p>
                            <p>{record.user?.email}</p>
                          </div>
                        }
                      >
                        {record.user.name || record.user.email}
                      </ClickableTooltip>
                    </TableCell>
                    <TableCell className="col-span-1 hidden justify-center sm:flex">
                      <TimeAgoIntl
                        date={record.modified_on as unknown as Date}
                      />
                    </TableCell>
                    <TableCell className="col-span-1 flex justify-center">
                      {record.active === 3 ? (
                        <Button
                          className="h-7 text-nowrap px-1 text-xs sm:px-1.5"
                          size="sm"
                          variant={"outline"}
                          onClick={() => {
                            setCurrentEditRecord(record);
                            setShowForm(false);
                            setFormType("edit");
                            setShowForm(!isShowForm);
                          }}
                        >
                          <p className="hidden text-nowrap sm:block">
                            {t("Reject")}
                          </p>
                          <Icons.close className="mx-0.5 size-4 sm:ml-1 sm:size-3" />
                        </Button>
                      ) : [0, 1].includes(record.active) ? (
                        <Button
                          className="h-7 text-nowrap px-1 text-xs hover:bg-slate-100 dark:hover:text-primary-foreground sm:px-1.5"
                          size="sm"
                          variant={"outline"}
                          onClick={() => {
                            setCurrentEditRecord(record);
                            setShowForm(false);
                            setFormType("edit");
                            setShowForm(!isShowForm);
                          }}
                        >
                          <p className="hidden text-nowrap sm:block">
                            {t("Edit")}
                          </p>
                          <PenLine className="mx-0.5 size-4 sm:ml-1 sm:size-3" />
                        </Button>
                      ) : record.active === 2 &&
                        user.role === "ADMIN" &&
                        isAdmin ? (
                        <Button
                          className="h-7 text-nowrap px-1 text-xs hover:bg-blue-400 dark:hover:text-primary-foreground sm:px-1.5"
                          size="sm"
                          variant={"blue"}
                          onClick={() => {
                            setCurrentEditRecord(record);
                            setShowForm(false);
                            setFormType("edit");
                            setShowForm(!isShowForm);
                          }}
                        >
                          <p className="hidden text-nowrap sm:block">
                            {t("Review")}
                          </p>
                          <Icons.eye className="mx-0.5 size-4 sm:ml-1 sm:size-3" />
                        </Button>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyPlaceholder className="shadow-none">
                  <EmptyPlaceholder.Icon name="globe" />
                  <EmptyPlaceholder.Title>
                    {t("No Subdomains")}
                  </EmptyPlaceholder.Title>
                  <EmptyPlaceholder.Description>
                    You don&apos;t have any subdomain yet. Start creating
                    record.
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
        <RecordForm
          user={{ id: user.id, name: user.name || "", email: user.email || "" }}
          isShowForm={isShowForm}
          setShowForm={setShowForm}
          type={formType}
          initData={currentEditRecord}
          action={action}
          onRefresh={handleRefresh}
        />
      </Modal>
    </>
  );
}

const SwitchWrapper = ({
  record,
  onChangeStatu,
}: {
  record: UserRecordFormData;
  onChangeStatu: (
    checked: boolean,
    record: UserRecordFormData,
    setChecked: (value: boolean) => void,
  ) => Promise<void>;
}) => {
  const [checked, setChecked] = useState(record.active === 1);

  return (
    <Switch
      checked={checked}
      onCheckedChange={(value) => onChangeStatu(value, record, setChecked)}
    />
  );
};
