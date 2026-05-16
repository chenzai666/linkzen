import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { getMultipleConfigs } from "@/lib/dto/system-config";
import { hashPassword, verifyPassword } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { email: username, password } = await req.json();
    if (!username || !password) {
      return Response.json("username and password is required", { status: 400 });
    }

    const userCount = await prisma.user.count();

    // 数据库没有用户时，第一个账号自动成为管理员
    if (userCount === 0) {
      const newUser = await prisma.user.create({
        data: {
          email: username,
          name: username,
          password: hashPassword(password),
          role: "ADMIN",
          active: 1,
        },
      });
      return Response.json(newUser, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: username } });

    if (!user) {
      // 用户不存在，检查是否开放注册
      const configs = await getMultipleConfigs(["enable_user_registration"]);
      if (!configs.enable_user_registration) {
        return Response.json("Registration is closed", { status: 403 });
      }
      const newUser = await prisma.user.create({
        data: {
          email: username,
          name: username,
          password: hashPassword(password),
          role: "USER",
          active: 1,
        },
      });
      return Response.json(newUser, { status: 200 });
    }

    if (user.active === 0) {
      return Response.json(null, { status: 403 });
    }

    const passwordCorrect = verifyPassword(password, user.password || "");
    if (passwordCorrect) {
      return Response.json(user, { status: 200 });
    }

    return Response.json(null, { status: 400 });
  } catch (error) {
    console.error("[Auth Error]", error);
    return Response.json(error.message || "Server error", { status: 500 });
  }
}
