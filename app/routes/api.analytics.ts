import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";

  const since = rangeToDate(range);

  const [entries, waitTimes] = await Promise.all([
    db.waitlistEntry.findMany({
      where: {
        status: "DONE",
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        locationId: true,
        shopifyCustomerStatus: true,
        shopifyCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.waitlistEntry.findMany({
      where: {
        status: "DONE",
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  const avgWaitMs =
    waitTimes.length > 0
      ? waitTimes.reduce((sum, e) => sum + (e.updatedAt.getTime() - e.createdAt.getTime()), 0) /
        waitTimes.length
      : 0;

  const avgWaitMinutes = Math.round(avgWaitMs / 1000 / 60);

  const newToMarketing = entries.filter(
    (e) => e.shopifyCustomerStatus === "CREATED"
  ).length;

  return Response.json({
    entries,
    metrics: {
      totalServed: entries.length,
      avgWaitMinutes,
      newToMarketing,
    },
  });
}

function rangeToDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}