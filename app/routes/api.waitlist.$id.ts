import { WaitlistStatus } from "app/generated/prisma/client";
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

export async function action({ request, params }: { request: Request; params: { id?: string } }) {
  await requirePosIdToken(request);

  const id = params.id;
  if (!id) return json({ error: "Missing id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "").toUpperCase();

  if (!["WAITING", "IN_SERVICE", "DONE"].includes(status)) {
    return json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await db.waitlistEntry.update({
    where: { id },
    data: { status: status as WaitlistStatus },
  });

  console.log(JSON.stringify({ msg: "waitlist.updated", id, status, ts: new Date().toISOString() }));

  return json({ item: updated });
}
