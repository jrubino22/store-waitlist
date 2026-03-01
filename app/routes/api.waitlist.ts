import db from "../db.server";
import { requirePosIdToken } from "../services/pos-auth.server";
import { corsJson, withCors } from "../lib/cors.server";

export async function loader({ request }: { request: Request }) {
  return withCors(request, async () => {
    if (request.method !== "GET") {
      return corsJson(
        request,
        { error: `Method ${request.method} not allowed.` },
        { status: 405 },
      );
    }

    await requirePosIdToken(request);

    const url = new URL(request.url);
    const locationId = String(url.searchParams.get("locationId") ?? "").trim();

    if (!locationId) {
      return corsJson(
        request,
        { error: "locationId query param is required." },
        { status: 400 },
      );
    }

    const items = await db.waitlistEntry.findMany({
      where: {
        locationId,
        status: {
          in: ["WAITING", "IN_SERVICE"],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return corsJson(request, { items });
  });
}

export async function action({ request }: { request: Request }) {
  return withCors(request, async () => {
    await requirePosIdToken(request);

    const body = await request.json().catch(() => ({}));
    console.log('body server', body);

    const locationId = String(body?.locationId);
    const customerName = String(body?.customerName ?? "").trim();
    const customerEmail = body?.customerEmail
      ? String(body.customerEmail).trim()
      : null;
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!locationId) {
      return corsJson(
        request,
        { error: "locationId is required (number)." },
        { status: 400 },
      );
    }

    if (!customerName) {
      return corsJson(
        request,
        { error: "customerName is required." },
        { status: 400 },
      );
    }

    const created = await db.waitlistEntry.create({
      data: {
        locationId,
        customerName,
        customerEmail,
        notes,
        status: "WAITING",
      },
    });

    console.log(
      JSON.stringify({
        msg: "waitlist.created",
        id: created.id,
        locationId,
        ts: new Date().toISOString(),
      }),
    );

    return corsJson(request, { item: created }, { status: 201 });
  });
}