import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { Icons } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const t = await getTranslations("Auth");
  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      {/* 移动端返回按钮 */}
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "absolute left-4 top-4 lg:hidden",
        )}
      >
        <Icons.chevronLeft className="mr-2 size-4" />
        {t("Back")}
      </Link>

      <div className="flex flex-col space-y-2 text-center">
        {/* 移动端 Logo */}
        <Icons.logo className="mx-auto size-10 lg:hidden" />
        <div className="text-2xl font-semibold tracking-tight">
          {t("Welcome to")} {siteConfig.name}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Choose your login method to continue")}
        </p>
      </div>

      <Suspense>
        <UserAuthForm />
      </Suspense>

      <p className="px-2 text-center text-sm text-muted-foreground">
        {t("By clicking continue, you agree to our")}{" "}
        <Link
          href="/terms"
          className="hover:text-brand underline underline-offset-4"
        >
          {t("Terms of Service")}
        </Link>{" "}
        {t("and")}{" "}
        <Link
          href="/privacy"
          className="hover:text-brand underline underline-offset-4"
        >
          {t("Privacy Policy")}
        </Link>
        .
      </p>
    </div>
  );
}
