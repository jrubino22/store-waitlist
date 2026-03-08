import { useLoaderData, useSearchParams } from "react-router";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";
  const since = rangeToDate(range);

  const entries = await db.waitlistEntry.findMany({
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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const avgWaitMs =
    entries.length > 0
      ? entries.reduce(
          (sum, e) => sum + (e.updatedAt.getTime() - e.createdAt.getTime()),
          0
        ) / entries.length
      : 0;

  return Response.json({
    entries,
    metrics: {
      totalServed: entries.length,
      avgWaitMinutes: Math.round(avgWaitMs / 1000 / 60),
      newToMarketing: entries.filter((e) => e.shopifyCustomerStatus === "CREATED").length,
    },
    range,
  });
}

function rangeToDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all": return null;
    default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function formatWaitTime(createdAt: string, updatedAt: string) {
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ShopifyStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case "CREATED": return <s-badge tone="success">New to Shopify</s-badge>;
    case "EXISTING": return <s-badge tone="info">Existing</s-badge>;
    case "FAILED": return <s-badge tone="critical">Sync Failed</s-badge>;
    case "SKIPPED": return <s-badge tone="neutral">No Email</s-badge>;
    default: return <s-badge tone="neutral">Unknown</s-badge>;
  }
}

type LoaderData = {
  entries: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    locationId: string;
    shopifyCustomerStatus: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  metrics: {
    totalServed: number;
    avgWaitMinutes: number;
    newToMarketing: number;
  };
  range: string;
};

export default function Analytics() {
  const { entries, metrics, range } = useLoaderData() as LoaderData;
  const [, setSearchParams] = useSearchParams();

  return (
    <s-page heading="Waitlist Analytics">

      {/* Range selector */}
      <s-section>
        <s-select
          label="Time range"
          value={range}
          onInput={(e: any) => setSearchParams({ range: e.currentTarget.value })}
        >
          <s-option value="today">Today</s-option>
          <s-option value="7d">Last 7 days</s-option>
          <s-option value="30d">Last 30 days</s-option>
          <s-option value="all">All time</s-option>
        </s-select>
      </s-section>

      {/* Metric cards */}
      <s-section>
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Customers Served</s-text>
              <s-heading>{metrics.totalServed}</s-heading>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Avg Wait Time</s-text>
              <s-heading>{metrics.avgWaitMinutes} min</s-heading>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text>Added to Marketing</s-text>
              <s-heading>{metrics.newToMarketing}</s-heading>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Table */}
      <s-section heading="Completed Entries" padding="none">
        {entries.length === 0 ? (
          <s-section>
            <s-paragraph>No completed entries for this period.</s-paragraph>
          </s-section>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Name</s-table-header>
              <s-table-header listSlot="labeled">Email</s-table-header>
              <s-table-header listSlot="labeled">Location</s-table-header>
              <s-table-header listSlot="labeled">Wait Time</s-table-header>
              <s-table-header listSlot="inline">Shopify Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {entries.map((entry) => (
                <s-table-row key={entry.id}>
                  <s-table-cell>{entry.customerName}</s-table-cell>
                  <s-table-cell>{entry.customerEmail ?? "—"}</s-table-cell>
                  <s-table-cell>{entry.locationId}</s-table-cell>
                  <s-table-cell>{formatWaitTime(entry.createdAt, entry.updatedAt)}</s-table-cell>
                  <s-table-cell>
                    <ShopifyStatusBadge status={entry.shopifyCustomerStatus} />
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};