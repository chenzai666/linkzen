import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "types";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "MENU",
    items: [
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      {
        href: "",
        icon: "link",
        title: "Short Urls",
        items: [
          { href: "/dashboard/urls", title: "Links" },
          { href: "/dashboard/urls/analytics", title: "Analytics" },
          { href: "/dashboard/urls/logs", title: "Ip Logs" },
          { href: "/dashboard/urls/api", title: "API" },
        ],
      },
      { href: "/dashboard/records", icon: "globe", title: "DNS Records" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      {
        href: "/admin",
        icon: "laptop",
        title: "Admin Panel",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/users",
        icon: "users",
        title: "Users",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "",
        icon: "boxes",
        title: "Resources",
        authorizeOnly: UserRole.ADMIN,
        items: [
          {
            href: "",
            title: "URLs",
            authorizeOnly: UserRole.ADMIN,
            items: [
              {
                href: "/admin/urls",
                title: "List",
                authorizeOnly: UserRole.ADMIN,
              },
              {
                href: "/admin/urls/analytics",
                title: "Analytics",
                authorizeOnly: UserRole.ADMIN,
              },
              {
                href: "/admin/urls/logs",
                title: "Ip Logs",
                authorizeOnly: UserRole.ADMIN,
              },
            ],
          },
          {
            href: "/admin/records",
            title: "Records",
            authorizeOnly: UserRole.ADMIN,
          },
        ],
      },
      {
        href: "",
        icon: "settings",
        title: "System Settings",
        authorizeOnly: UserRole.ADMIN,
        items: [
          {
            href: "/admin/system",
            title: "App Configs",
            authorizeOnly: UserRole.ADMIN,
          },
          {
            href: "/admin/system/domains",
            title: "Domains",
            authorizeOnly: UserRole.ADMIN,
          },
        ],
      },
    ],
  },
  {
    title: "OPTIONS",
    items: [
      { href: "/dashboard/settings", icon: "userSettings", title: "Settings" },
    ],
  },
];
