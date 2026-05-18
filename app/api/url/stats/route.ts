import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";
import { getStartDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";
    const startDate = getStartDate(range);

    // 管理员查全站，普通用户只查自己的链接
    const urlWhere =
      user.role === "ADMIN" ? {} : { userId: user.id };

    const data = await prisma.urlMeta.findMany({
      where: {
        ...(startDate && { createdAt: { gte: startDate } }),
        userUrl: { ...urlWhere },
      },
      orderBy: { updatedAt: "asc" },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(error?.statusText || error, {
      status: (error as any).status || 500,
    });
  }
}
