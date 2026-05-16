"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import pkg from "package.json";
import { toast } from "sonner";
import useSWR from "swr";

import { siteConfig } from "@/config/site";
import { fetcher } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/shared/icons";
import VersionNotifier from "@/components/shared/version-notifier";

export default function AppConfigs({}: {}) {
  const [isPending, startTransition] = useTransition();

  const {
    data: configs,
    isLoading,
    mutate,
  } = useSWR<Record<string, any>>("/api/admin/configs", fetcher);
  const [notification, setNotification] = useState("");

  const t = useTranslations("Setting");

  useEffect(() => {
    if (!isLoading && configs) {
      setNotification(configs?.system_notification);
    }

  }, [configs, isLoading]);

  const handleChange = (value: any, key: string, type: string) => {
    startTransition(async () => {
      const res = await fetch("/api/admin/configs", {
        method: "POST",
        body: JSON.stringify({ key, value, type }),
      });
      if (res.ok) {
        toast.success("已保存");
        mutate();
      } else {
        toast.error("保存失败", {
          description: await res.text(),
        });
      }
    });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <Card>
      <Collapsible className="group" defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <div className="text-lg font-bold">{t("App Configs")}</div>
          <Icons.chevronDown className="ml-auto size-4" />
          <Icons.settings className="ml-3 size-4 transition-all group-hover:scale-110" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("User Registration")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Allow users to sign up")}
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_user_registration}
                  onCheckedChange={(v) =>
                    handleChange(v, "enable_user_registration", "BOOLEAN")
                  }
                />
              )}
            </div>



            <div className="flex flex-col items-start justify-start gap-3">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("Notification")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Set system notification, this will be displayed in the header",
                  )}
                </p>
              </div>
              {configs && (
                <div className="flex w-full items-start gap-2">
                  <Textarea
                    className="h-16 max-h-32 min-h-9 resize-y bg-white dark:bg-neutral-700"
                    placeholder="Support HTML format, such as <div class='text-red-500'>Info</div>"
                    rows={5}
                    // defaultValue={configs.system_notification}
                    value={notification}
                    onChange={(e) => setNotification(e.target.value)}
                  />
                  <Button
                    className="h-9 text-nowrap"
                    disabled={
                      isPending || notification === configs.system_notification
                    }
                    onClick={() =>
                      handleChange(
                        notification,
                        "system_notification",
                        "STRING",
                      )
                    }
                  >
                    {t("Save")}
                  </Button>
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-1 text-xs text-muted-foreground/90"
              style={{ fontFamily: "Bahamas Bold" }}
            >
              {siteConfig.name} v{pkg.version}
              <VersionNotifier />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>


      <Collapsible className="group">
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <div className="text-lg font-bold">{t("Subdomain Configs")}</div>
          <Icons.chevronDown className="ml-auto size-4" />
          <Icons.globeLock className="ml-3 size-4 transition-all group-hover:scale-110" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">{t("Subdomain Apply Mode")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Enable subdomain apply mode, each submission requires administrator review",
                  )}
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_subdomain_apply}
                  onCheckedChange={(v) =>
                    handleChange(v, "enable_subdomain_apply", "BOOLEAN")
                  }
                />
              )}
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1 leading-none">
                <p className="font-medium">
                  {t("Application Status Email Notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Send email notifications for subdomain application status updates; Notifies administrators when users submit applications and notifies users of approval results; Only available when subdomain application mode is enabled",
                  )}
                  . (Brevo)
                </p>
              </div>
              {configs && (
                <Switch
                  defaultChecked={configs.enable_subdomain_status_email_pusher}
                  onCheckedChange={(v) =>
                    handleChange(
                      v,
                      "enable_subdomain_status_email_pusher",
                      "BOOLEAN",
                    )
                  }
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
