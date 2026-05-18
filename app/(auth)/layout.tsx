import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/session";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { FlipWords } from "@/components/shared/flip-words";
import { Icons } from "@/components/shared/icons";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getCurrentUser();
  const t = await getTranslations("Auth");
  const appName = env.APP_NAME || siteConfig.name;

  if (user) {
    if (user.role === "ADMIN") redirect("/admin");
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen w-full">
      {/* 左侧装饰面板，仅在 lg 及以上显示 */}
      <div className="relative hidden flex-col border-r bg-muted p-16 lg:flex lg:w-1/2">
        <div className="absolute inset-0 overflow-hidden">
          <BackgroundPaths />
        </div>
        <h1 className="z-10 flex items-center gap-3 text-2xl font-semibold duration-1000 animate-in fade-in">
          <Icons.logo className="size-8" />
          <Link href="/" style={{ fontFamily: "Bahamas Bold" }}>
            {appName}
          </Link>
        </h1>
        <div className="flex-1" />
        <FlipWords
          words={[t("description")]}
          className="mb-4 text-muted-foreground"
        />
      </div>

      {/* 右侧登录表单 */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        {children}
      </div>
    </main>
  );
}
