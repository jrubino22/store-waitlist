//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { useEffect, useState } from "preact/hooks";

export default function QueueListScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugMsg, setDebugMsg] = useState("");

  async function loadQueue() {
    setLoading(true);
    setErrorMsg("");
    setDebugMsg("Loading queue...");

    try {
      const token = await shopify.session.getSessionToken();

      if (!token) {
        setErrorMsg("You don’t have permission to use this app.");
        setDebugMsg("No session token returned.");
        return;
      }

      const session = shopify.session.currentSession;
      const locationId = session?.locationId;

      if (!locationId) {
        setErrorMsg("Could not determine the current location in POS.");
        setDebugMsg("Missing locationId from current session.");
        return;
      }

      const url = `/api/waitlist?locationId=${encodeURIComponent(String(locationId))}`;
      setDebugMsg(`Fetching queue for location ${locationId}...`);

      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.error || data?.message || `Request failed (status ${res.status}).`;
        setErrorMsg(msg);
        setDebugMsg(`Queue fetch failed with status ${res.status}.`);
        return;
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
      setDebugMsg(`Loaded ${Array.isArray(data?.items) ? data.items.length : 0} queue items.`);
    } catch (err) {
      setErrorMsg("Network error loading queue.");
      setDebugMsg(`Caught error: ${String(err?.message || err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  return (
    <s-page heading="Waitlist">
      <s-scroll-box>
        <s-box padding="small" gap="small">
          {errorMsg ? <s-banner tone="critical">{errorMsg}</s-banner> : null}

          {debugMsg ? (
            <s-box padding="small">
              <s-text>Debug: {debugMsg}</s-text>
            </s-box>
          ) : null}

          <s-box gap="small">
            <s-button kind="primary" onClick={() => navigation.navigate("AddCustomer")}>
              Add customer
            </s-button>

            <s-button onClick={loadQueue} loading={loading}>
              Refresh
            </s-button>
          </s-box>

          {loading ? (
            <s-text>Loading queue...</s-text>
          ) : items.length === 0 ? (
            <s-text>No one is currently on the waitlist.</s-text>
          ) : (
            <s-box gap="small">
              {items.map((item) => (
                <s-box key={item.id} padding="small">
                  <s-text>{item.customerName}</s-text>
                  <s-text>{item.status}</s-text>
                  {item.customerEmail ? <s-text>{item.customerEmail}</s-text> : null}
                  {item.notes ? <s-text>{item.notes}</s-text> : null}
                </s-box>
              ))}
            </s-box>
          )}
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}