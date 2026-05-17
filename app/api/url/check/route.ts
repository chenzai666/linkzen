import { prisma } from "@/lib/db";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return true;
    return PRIVATE_IP_PATTERNS.some((p) => p.test(parsed.hostname));
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { ids, timeout = 6 }: { ids: string[]; timeout?: number } =
      await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "ids required" }, { status: 400 });
    }

    const timeoutMs = Math.min(Math.max(Number(timeout) || 6, 1), 30) * 1000;

    const urls = await prisma.userUrl.findMany({
      where: {
        id: { in: ids.slice(0, 20) },
        ...(user.role !== "ADMIN" ? { userId: user.id } : {}),
      },
      select: { id: true, target: true, url: true },
    });

    const results = await Promise.all(
      urls.map(async ({ id, target, url }) => {
        if (isPrivateUrl(target)) {
          return {
            id,
            url,
            target,
            status: 0,
            ok: false,
            duration: 0,
            error: "blocked",
            checkedAt: new Date().toISOString(),
          };
        }
        const start = Date.now();
        try {
          const res = await fetch(target, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(timeoutMs),
            headers: { "User-Agent": "Mozilla/5.0 LinkZen-Checker/1.0" },
          });
          return {
            id,
            url,
            target,
            status: res.status,
            ok: res.status < 400,
            duration: Date.now() - start,
            checkedAt: new Date().toISOString(),
          };
        } catch (e: any) {
          return {
            id,
            url,
            target,
            status: 0,
            ok: false,
            duration: Date.now() - start,
            error: e?.name === "TimeoutError" ? "timeout" : "network_error",
            checkedAt: new Date().toISOString(),
          };
        }
      }),
    );

    const map: Record<string, (typeof results)[0]> = {};
    results.forEach((r) => (map[r.id] = r));
    return Response.json(map);
  } catch (error: any) {
    return Response.json(error?.message || "error", { status: 500 });
  }
}
