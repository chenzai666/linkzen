import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

import AppConfigs from "./app-configs";

export const metadata = constructMetadata({
  title: "System Settings",
  description: "",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  return (
    <>
      <DashboardHeader heading="System Settings" text="" />
      <AppConfigs />
    </>
  );
}
