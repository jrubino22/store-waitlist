import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { WaitlistStatus } from "@prisma/client";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { cors } = await authenticate.pos(request);

  const { id } = params;
  if (!id) return cors(Response.json({ error: "Missing id" }, { status: 400 }));

  const item = await db.waitlistEntry.findUnique({ where: { id } });
  if (!item) return cors(Response.json({ error: "Not found" }, { status: 404 }));

  return cors(Response.json({ item }));
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { cors } = await authenticate.pos(request);

  const { id } = params;
  if (!id) return cors(Response.json({ error: "Missing id" }, { status: 400 }));

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "").toUpperCase();
  const notes = body?.notes !== undefined ? String(body.notes).trim() : undefined;

  if (!["WAITING", "IN_SERVICE", "DONE"].includes(status)) {
    return cors(Response.json({ error: "Invalid status" }, { status: 400 }));
  }

  const updated = await db.waitlistEntry.update({
    where: { id },
    data: {
      status: status as WaitlistStatus,
      ...(notes !== undefined ? { notes: notes || null } : {}),
    },
  });

  console.log(JSON.stringify({ msg: "waitlist.updated", id, status, ts: new Date().toISOString() }));

  return cors(Response.json({ item: updated }));
}