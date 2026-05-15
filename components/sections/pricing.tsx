"use client";

import type React from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { buttonVariants } from "../ui/button";

export const PricingSection = () => {
  const t = useTranslations("Landing");

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-zinc-50 text-zinc-800 selection:bg-zinc-200 dark:bg-zinc-950 dark:text-zinc-200 dark:selection:bg-zinc-600"
    >
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(245,245,245,0.8),rgba(240,240,240,1))] dark:bg-[radial-gradient(100%_100%_at_50%_0%,rgba(13,13,17,1),rgba(9,9,11,1))]"></div>
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:px-8">
        <div className="mb-12 space-y-3">
          <h2 className="text-center text-xl font-semibold leading-tight sm:text-3xl sm:leading-tight md:text-4xl md:leading-tight">
            {t("pricingTitle")}
          </h2>
          <p className="text-center text-base text-zinc-600 dark:text-zinc-400 md:text-lg">
            {t("pricingDescription")}
          </p>
        </div>

        <Link
          href="/dashboard"
          prefetch={true}
          className={cn(
            buttonVariants({ rounded: "xl", size: "lg" }),
            "mx-auto mt-16 px-4 text-[15px] font-semibold",
          )}
        >
          {t("Try the cloud version")}
        </Link>
      </div>
    </section>
  );
};

type CardProps = {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

const Card = ({ className, children, style = {} }: CardProps) => {
  return (
    <motion.div
      initial={{
        filter: "blur(2px)",
      }}
      whileInView={{
        filter: "blur(0px)",
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
        delay: 0.25,
      }}
      style={style}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50/50 to-zinc-100/80 p-6 dark:border-zinc-700 dark:from-zinc-950/50 dark:to-zinc-900/80",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};
