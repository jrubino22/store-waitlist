import { WaitlistStatus } from "app/generated/prisma/client";
import db from "../db.server";
import { requirePosIdToken } from "../services/pos-auth.server";
import { corsJson, withCors } from "../lib/cors.server";

export async function loader({ request, params }: { request: Request; params: { id?: string } }) {
  return withCors(request, async () => {
    await requirePosIdToken(request);

    const id = params.id;
    if (!id) return corsJson(request, { error: "Missing id" }, { status: 400 });

    const item = await db.waitlistEntry.findUnique({ where: { id } });
    if (!item) return corsJson(request, { error: "Not found" }, { status: 404 });

    return corsJson(request, { item });
  });
}

export async function action({ request, params }: { request: Request; params: { id?: string } }) {
  return withCors(request, async () => {

    if (request.method.toUpperCase() !== "PATCH") {
      return corsJson(request, { error: `Method ${request.method} not allowed.` }, { status: 405 });
    }

    await requirePosIdToken(request);

    const id = params.id;
    if (!id) return corsJson(request, { error: "Missing id" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const status = String(body?.status ?? "").toUpperCase();
    const notes = body?.notes !== undefined ? String(body.notes).trim() : undefined;

    if (!["WAITING", "IN_SERVICE", "DONE"].includes(status)) {
      return corsJson(request, { error: "Invalid status" }, { status: 400 });
    }

    const updated = await db.waitlistEntry.update({
      where: { id },
      data: {
        status: status as WaitlistStatus,
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    });

    console.log(JSON.stringify({ msg: "waitlist.updated", id, status, ts: new Date().toISOString() }));

    return corsJson(request, { item: updated });
  });
}