import { getMultipleConfigs } from "@/lib/dto/system-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await getMultipleConfigs([
      "enable_user_registration",
      "enable_subdomain_apply",
      "system_notification",
      "enable_github_oauth",
      "enable_google_oauth",
      "enable_liunxdo_oauth",
      "enable_resend_email_login",
      "enable_email_password_login",
      "enable_email_registration_suffix_limit",
      "email_registration_suffix_limit_white_list",
    ]);
    return Response.json({
      google: false,
      github: false,
      linuxdo: false,
      resend: false,
      credentials: true,
      registration: configs.enable_user_registration ?? false,
      enableSuffixLimit: false,
      suffixWhiteList: "",
    });
  } catch (error) {
    console.log("[Error]", error);
  }
}
