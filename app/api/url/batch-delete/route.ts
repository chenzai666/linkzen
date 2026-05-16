import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json("ids 不能为空", { status: 400 });
    }

    const result = await prisma.userUrl.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    });

    return Response.json({ deleted: result.count });
  } catch (error) {
    return Response.json("服务器错误", { status: 500 });
  }
}
