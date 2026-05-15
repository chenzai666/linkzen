import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const email_r2_domain = env.NEXT_PUBLIC_EMAIL_R2_DOMAIN || "";
const support_email = env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@linkzen.app";
const app_name = env.NEXT_PUBLIC_APP_NAME || "LinkZen";

export const siteConfig: SiteConfig = {
  name: app_name,
  description: "Short links & DNS management platform.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "",
    github: "",
    feedback: "",
    discord: "",
    oichat: "",
  },
  mailSupport: support_email,
  emailR2Domain: email_r2_domain,
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Platform",
    items: [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Short Links", href: "/dashboard/urls" },
      { title: "DNS Records", href: "/dashboard/records" },
    ],
  },
  {
    title: "Account",
    items: [
      { title: "Settings", href: "/dashboard/settings" },
      { title: "API", href: "/dashboard/urls/api" },
    ],
  },
];
