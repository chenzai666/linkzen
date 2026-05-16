import { checkUserStatus } from "@/lib/dto/user";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;
    if (user.role !== "ADMIN") {
      return Response.json("Unauthorized", { status: 401 });
    }

    const data = await req.json();
    const { email, name, role, active, password } = data;

    if (!email) {
      return Response.json("用户名不能为空", { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return Response.json("用户名已存在", { status: 400, statusText: "用户名已存在" });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email,
        role: role || "USER",
        active: active ?? 1,
        password: password ? hashPassword(password) : null,
      },
    });

    return Response.json(newUser);
  } catch (error) {
    return Response.json({ statusText: "Server error" }, { status: 500 });
  }
}
