import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserApiKeyForm } from "@/components/forms/user-api-key-form";
import { UserNameForm } from "@/components/forms/user-name-form";
import { UserPasswordForm } from "@/components/forms/user-password-form";

export const metadata = constructMetadata({
  title: "Settings",
  description: "Configure your account settings.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  return (
    <>
      <DashboardHeader
        heading="Account Settings"
        text="Manage account settings"
      />
      <div className="divide-y divide-muted pb-10">
        <UserNameForm user={{ id: user.id, name: user.name || "" }} />
        <UserPasswordForm user={{ id: user.id, name: user.name || "" }} />
        <UserApiKeyForm
          user={{
            id: user.id,
            name: user.name || "",
            apiKey: user.apiKey || "",
          }}
        />
        <DeleteAccountSection />
      </div>
    </>
  );
}
