import { getDomainsByFeature } from "@/lib/dto/domains";
import { createUserShortUrl } from "@/lib/dto/short-urls";
import { checkUserStatus } from "@/lib/dto/user";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json("数据格式错误", { status: 400 });
    }

    const zones = await getDomainsByFeature("enable_short_link");
    const validDomains = zones.map((z) => z.domain_name);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      const { target, url, prefix, visible, active, expiration, password } = item;

      if (!target || !url || !prefix) {
        skipped++;
        continue;
      }

      if (!validDomains.includes(prefix)) {
        skipped++;
        errors.push(`域名 ${prefix} 未配置，跳过 ${url}`);
        continue;
      }

      const exists = await prisma.userUrl.findUnique({ where: { url } });

      if (exists) {
        // 已存在则覆盖
        await prisma.userUrl.update({
          where: { url },
          data: {
            target,
            prefix,
            visible: visible ?? exists.visible,
            active: active ?? exists.active,
            expiration: expiration ?? exists.expiration,
            password: password ?? exists.password,
            updatedAt: new Date().toISOString(),
          },
        });
        updated++;
      } else {
        const res = await createUserShortUrl({
          userId: user.id,
          userName: user.name || "",
          target,
          url,
          prefix,
          visible: visible ?? 1,
          active: active ?? 1,
          expiration: expiration ?? "-1",
          password: password ?? "",
        });
        if (res.status === "success") {
          created++;
        } else {
          skipped++;
          errors.push(`${url}: ${res.status}`);
        }
      }
    }

    return Response.json({ created, updated, skipped, errors });
  } catch (error) {
    return Response.json("服务器错误", { status: 500 });
  }
}
