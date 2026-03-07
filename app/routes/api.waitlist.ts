import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { findOrCreateShopifyCustomer } from "../services/shopify-customer.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { cors } = await authenticate.pos(request);

  const url = new URL(request.url);
  const locationId = String(url.searchParams.get("locationId") ?? "").trim();

  if (!locationId) {
    return cors(Response.json({ error: "locationId query param is required." }, { status: 400 }));
  }

  const items = await db.waitlistEntry.findMany({
    where: {
      locationId,
      status: { in: ["WAITING", "IN_SERVICE"] },
    },
    orderBy: { createdAt: "asc" },
  });

  return cors(Response.json({ items }));
}

export async function action({ request }: ActionFunctionArgs) {
  const { cors, sessionToken } = await authenticate.pos(request);
  const shop = sessionToken.dest.replace("https://", "");

  const body = await request.json().catch(() => ({}));

  const locationId = String(body?.locationId ?? "").trim();
  const customerName = String(body?.customerName ?? "").trim();
  const customerEmail = body?.customerEmail ? String(body.customerEmail).trim() : null;
  const notes = body?.notes ? String(body.notes).trim() : null;

  if (!locationId) {
    return cors(Response.json({ error: "locationId is required." }, { status: 400 }));
  }
  if (!customerName) {
    return cors(Response.json({ error: "customerName is required." }, { status: 400 }));
  }

  const created = await db.waitlistEntry.create({
    data: { locationId, customerName, customerEmail, notes, status: "WAITING" },
  });

  console.log(JSON.stringify({ msg: "waitlist.created", id: created.id, locationId, ts: new Date().toISOString() }));

  const [firstName, ...rest] = customerName.split(" ");
  findOrCreateShopifyCustomer({ shop, firstName, lastName: rest.join(" ") || "", email: customerEmail })
    .then(async (result) => {
      await db.waitlistEntry.update({
        where: { id: created.id },
        data: {
          shopifyCustomerStatus: result.status,
          shopifyCustomerId: result.status === "CREATED" || result.status === "EXISTING"
            ? result.shopifyCustomerId
            : null,
        },
      });
      console.log(JSON.stringify({ msg: "shopify.customer.synced", result }));
    })
    .catch((err) => {
      console.error(JSON.stringify({ msg: "shopify.customer.sync.error", error: String(err) }));
    });

  return cors(Response.json({ item: created }, { status: 201 }));
}