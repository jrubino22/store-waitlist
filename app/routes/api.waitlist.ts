import db from "../db.server";
import { requirePosIdToken } from "../services/pos-auth.server";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

// POST /api/waitlist
export async function action({ request }: { request: Request }) {
  // Auth from POS session token (we’re keeping this minimal for now)
  await requirePosIdToken(request);

  const body = await request.json().catch(() => ({}));

  const locationId = Number(body?.locationId);
  const customerName = String(body?.customerName ?? "").trim();
  const customerEmail = body?.customerEmail ? String(body.customerEmail).trim() : null;
  const notes = body?.notes ? String(body.notes).trim() : null;

  if (!Number.isFinite(locationId)) {
    return json({ error: "locationId is required (number)." }, { status: 400 });
  }
  if (!customerName) {
    return json({ error: "customerName is required." }, { status: 400 });
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
    })
  );

  return json({ item: created }, { status: 201 });
}