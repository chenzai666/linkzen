import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";

import LinkChecker from "./link-checker";

export const metadata = constructMetadata({
  title: "链接检测",
  description: "检测短链目标 URL 的可访问状态",
});

export default async function LinkCheckPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  return (
    <LinkChecker
      user={{ id: user.id, role: user.role }}
      action={user.role === "ADMIN" ? "/api/url/admin" : "/api/url"}
    />
  );
}
