import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;
    if (user.role !== "ADMIN") {
      return Response.json("Unauthorized", { status: 401 });
    }

    const { domain_names } = await req.json();
    if (!Array.isArray(domain_names) || domain_names.length === 0) {
      return Response.json("domain_names 不能为空", { status: 400 });
    }

    const result = await prisma.domain.deleteMany({
      where: { domain_name: { in: domain_names } },
    });

    return Response.json({ deleted: result.count });
  } catch (error) {
    return Response.json("服务器错误", { status: 500 });
  }
}
