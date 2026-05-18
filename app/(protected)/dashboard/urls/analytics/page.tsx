import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";

import SiteAnalytics from "./site-analytics";

export const metadata = constructMetadata({
  title: "访客统计",
  description: "全站访客统计分析。",
});

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  const t = await getTranslations("Components");

  return <SiteAnalytics user={user} />;
}
