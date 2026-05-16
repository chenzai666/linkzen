import { getDomainsByFeature } from "@/lib/dto/domains";
import { createUserShortUrl } from "@/lib/dto/short-urls";
import { checkUserStatus } from "@/lib/dto/user";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;
    if (user.role !== "ADMIN") {
      return Response.json("Unauthorized", { status: 401 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json("数据格式错误", { status: 400 });
    }

    const zones = await getDomainsByFeature("enable_short_link");
    const validDomains = zones.map((z) => z.domain_name);

    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      const { target, url, prefix, visible, active, expiration, password, userId, userName } = item;

      if (!target || !url || !prefix) {
        skipped++;
        continue;
      }

      if (!validDomains.includes(prefix)) {
        skipped++;
        errors.push(`域名 ${prefix} 未配置，跳过 ${url}`);
        continue;
      }

      // 去重：url 已存在则跳过
      const exists = await prisma.userUrl.findUnique({ where: { url } });
      if (exists) {
        skipped++;
        continue;
      }

      const res = await createUserShortUrl({
        userId: userId || user.id,
        userName: userName || user.name || "",
        target,
        url,
        prefix,
        visible: visible ?? 1,
        active: active ?? 1,
        expiration: expiration ?? "-1",
        password: password ?? "",
      });

      if (res.status === "success") {
        success++;
      } else {
        skipped++;
        errors.push(`${url}: ${res.status}`);
      }
    }

    return Response.json({ success, skipped, errors });
  } catch (error) {
    return Response.json("服务器错误", { status: 500 });
  }
}
