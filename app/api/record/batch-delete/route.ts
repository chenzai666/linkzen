import { deleteDNSRecord } from "@/lib/cloudflare";
import { deleteUserRecord } from "@/lib/dto/cloudflare-dns-record";
import { getDomainsByFeature } from "@/lib/dto/domains";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json("items 不能为空", { status: 400 });
    }

    const zones = await getDomainsByFeature("enable_dns", true);

    let deleted = 0;
    let failed = 0;

    for (const item of items) {
      const { record_id, zone_id, active } = item;
      if (!record_id || !zone_id) { failed++; continue; }

      const matchedZone = zones.find((z) => z.cf_zone_id === zone_id);
      if (!matchedZone) { failed++; continue; }

      try {
        if (active !== 3) {
          await deleteDNSRecord(
            matchedZone.cf_zone_id!,
            matchedZone.cf_api_key!,
            matchedZone.cf_email!,
            record_id,
          );
        }
        await deleteUserRecord(user.id, record_id, zone_id, active);
        deleted++;
      } catch {
        failed++;
      }
    }

    return Response.json({ deleted, failed });
  } catch (error) {
    return Response.json("服务器错误", { status: 500 });
  }
}
