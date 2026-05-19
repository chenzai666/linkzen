import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { TIME_RANGES } from "@/lib/enums";
import { getCurrentUser } from "@/lib/session";
import { getStartDate } from "@/lib/utils";

export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;
    if (user.role !== "ADMIN") {
      return Response.json("Unauthorized", {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";

    const startDate = getStartDate(range);
    if (!startDate) {
      return Response.json({ statusText: "Invalid range" }, { status: 400 });
    }

    const rangeDuration = TIME_RANGES[range];
    const prevStartDate = new Date(startDate.getTime() - rangeDuration);
    const prevEndDate = startDate;

    const [users, records, urls, prevUsers, prevRecords, prevUrls] =
      await Promise.all([
        prisma.user.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.userRecord.findMany({
          where: { created_on: { gte: startDate } },
          orderBy: { created_on: "desc" },
          select: { created_on: true },
        }),
        prisma.userUrl.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: prevStartDate, lt: prevEndDate } },
          select: { createdAt: true },
        }),
        prisma.userRecord.findMany({
          where: { created_on: { gte: prevStartDate, lt: prevEndDate } },
          select: { created_on: true },
        }),
        prisma.userUrl.findMany({
          where: { createdAt: { gte: prevStartDate, lt: prevEndDate } },
          select: { createdAt: true },
        }),
      ]);

    const userCountByDate: { [date: string]: number } = {};
    const recordCountByDate: { [date: string]: number } = {};
    const urlCountByDate: { [date: string]: number } = {};

    users.forEach((u) => {
      const date = u.createdAt!.toISOString().split("T")[0];
      userCountByDate[date] = (userCountByDate[date] || 0) + 1;
    });
    records.forEach((r) => {
      const date = r.created_on!.toISOString().split("T")[0];
      recordCountByDate[date] = (recordCountByDate[date] || 0) + 1;
    });
    urls.forEach((u) => {
      const date = u.createdAt.toISOString().split("T")[0];
      urlCountByDate[date] = (urlCountByDate[date] || 0) + 1;
    });

    const allDates = Array.from(
      new Set([
        ...Object.keys(userCountByDate),
        ...Object.keys(recordCountByDate),
        ...Object.keys(urlCountByDate),
      ]),
    );
    const combinedData = allDates.map((date) => ({
      date,
      records: recordCountByDate[date] || 0,
      urls: urlCountByDate[date] || 0,
      users: userCountByDate[date] || 0,
    }));

    const total = {
      records: combinedData.reduce((acc, curr) => acc + curr.records, 0),
      urls: combinedData.reduce((acc, curr) => acc + curr.urls, 0),
      users: combinedData.reduce((acc, curr) => acc + curr.users, 0),
      emails: 0,
      inbox: 0,
      sends: 0,
    };

    const prevTotal = {
      records: prevRecords.length,
      urls: prevUrls.length,
      users: prevUsers.length,
    };

    const growthRates = {
      records:
        prevTotal.records === 0
          ? total.records > 0 ? 100 : 0
          : ((total.records - prevTotal.records) / prevTotal.records) * 100,
      urls:
        prevTotal.urls === 0
          ? total.urls > 0 ? 100 : 0
          : ((total.urls - prevTotal.urls) / prevTotal.urls) * 100,
      users:
        prevTotal.users === 0
          ? total.users > 0 ? 100 : 0
          : ((total.users - prevTotal.users) / prevTotal.users) * 100,
      emails: 0,
      inbox: 0,
      sends: 0,
    };

    return Response.json({
      list: combinedData.reverse(),
      total,
      growthRates,
    });
  } catch (error) {
    return Response.json({ statusText: "Server error" }, { status: 500 });
  }
}
