import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ShortUrlFormData } from "@/lib/dto/short-urls";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/shared/icons";

interface ExportConfig {
  filename?: string;
  fields?: (keyof ShortUrlFormData)[];
  filter?: (item: ShortUrlFormData) => boolean;
  sort?: (a: ShortUrlFormData, b: ShortUrlFormData) => number;
  format?: "pretty" | "compact";
}

export const exportToJsonAdvanced = (
  data: ShortUrlFormData[],
  config: ExportConfig = {},
) => {
  const {
    filename = "short-urls",
    fields,
    filter,
    sort,
    format = "pretty",
  } = config;

  try {
    let processedData = [...data];

    // 应用过滤器
    if (filter) {
      processedData = processedData.filter(filter);
    }

    // 应用排序
    if (sort) {
      processedData = processedData.sort(sort);
    }

    // 选择特定字段
    if (fields) {
      processedData = processedData.map((item) => {
        const filteredItem: Partial<ShortUrlFormData> = {};
        fields.forEach((field) => {
          filteredItem[field] = item[field] as any;
        });
        return filteredItem as ShortUrlFormData;
      });
    }

    // 格式化 JSON
    const indent = format === "pretty" ? 2 : 0;
    const jsonString = JSON.stringify(processedData, null, indent);

    // 创建并下载文件
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      exportedCount: processedData.length,
      totalCount: data.length,
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const useJsonExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>("");

  const exportData = async (
    data: ShortUrlFormData[],
    config?: ExportConfig,
  ) => {
    setIsExporting(true);
    setExportStatus("正在导出...");

    try {
      const result = exportToJsonAdvanced(data, config);

      if (result.success) {
        setExportStatus(`成功导出 ${result.exportedCount} 条记录`);
      } else {
        setExportStatus(`导出失败: ${result.error}`);
      }

      // 3秒后清除状态
      setTimeout(() => {
        setExportStatus("");
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting,
    exportStatus,
  };
};

export const UrlImporter: React.FC<{
  onRefresh: () => void;
  action: string;
}> = ({ onRefresh, action }) => {
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      const list = Array.isArray(items) ? items : [items];

      const apiPath = action.indexOf("admin") > -1
        ? "/api/url/admin/import"
        : "/api/url/import";

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      });

      const result = await res.json();
      if (res.ok) {
        const parts = [];
        if (result.created) parts.push(`新增 ${result.created} 条`);
        if (result.updated) parts.push(`更新 ${result.updated} 条`);
        if (result.skipped) parts.push(`跳过 ${result.skipped} 条`);
        toast.success(`导入完成：${parts.join("，") || "无变更"}`);
        onRefresh();
      } else {
        toast.error("导入失败", { description: result });
      }
    } catch {
      toast.error("文件解析失败，请确认为有效的 JSON 格式");
    } finally {
      setIsImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        className="flex items-center gap-2 text-nowrap"
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
      >
        {isImporting ? (
          <Icons.spinner className="size-4 animate-spin" />
        ) : (
          <Icons.arrowUp className="size-4" />
        )}
        导入
      </Button>
    </>
  );
};

export const UrlExporter: React.FC<{
  data: ShortUrlFormData[];
}> = ({ data }) => {
  const { exportData } = useJsonExport();

  const t = useTranslations("List");

  const handleExportAll = () => {
    exportData(data, {
      filename: "all-urls",
      format: "pretty",
    });
  };

  const handleExportActive = () => {
    exportData(data, {
      filename: "active-urls",
      filter: (item) => item.active === 1,
      sort: (a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
      format: "pretty",
    });
  };

  const handleExportBasicInfo = () => {
    exportData(data, {
      filename: "urls",
      fields: ["prefix", "url", "target"],
      format: "compact",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="flex items-center gap-2 text-nowrap"
          variant={"outline"}
        >
          {t("Export")}
          <Icons.chevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Button
            className="flex w-full items-center gap-2 text-nowrap"
            size="sm"
            variant="ghost"
            onClick={handleExportAll}
          >
            {t("Export All")}
          </Button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Button
            className="flex w-full items-center gap-2"
            size="sm"
            variant="ghost"
            onClick={handleExportActive}
          >
            {t("Export Active")}
          </Button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Button
            className="flex w-full items-center gap-2"
            size="sm"
            variant="ghost"
            onClick={handleExportBasicInfo}
          >
            {t("Export Basic Info")}
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
