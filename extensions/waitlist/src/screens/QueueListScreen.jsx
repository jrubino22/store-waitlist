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

  async function handleUpdate(id) {
    setErrorMsg("");
    try {
      const token = await shopify.session.getSessionToken();
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "IN_SERVICE" }),
      });
  
      const data = await res.json().catch(() => ({}));
  
      if (!res.ok) {
        setErrorMsg(data?.error || `Request failed (status ${res.status}).`);
        return;
      }
  
      navigation.navigate(`CustomerInfo?id=${id}`);
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    }
  }

  function handleInfo(id) {
    navigation.navigate(`CustomerInfo?id=${id}`);
  }

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

          <s-stack direction="block" gap="small">
            <s-button kind="primary" onClick={() => navigation.navigate("AddCustomer")}>
              Add customer
            </s-button>

            <s-button onClick={loadQueue} loading={loading}>
              Refresh
            </s-button>
          </s-stack>

          {loading ? (
            <s-text>Loading queue...</s-text>
          ) : items.length === 0 ? (
            <s-text>No one is currently on the waitlist.</s-text>
          ) : (
            <s-stack padding="small" direction="block" gap="small">
              {items.map((item) => (
                <s-box key={item.id} padding="small">
                  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                    <s-text variant="headingSmall">{item.customerName}</s-text>
                    {item.status === 'WAITING' && (
                      <s-badge tone="info">Waiting</s-badge>
                    )}
                    {item.status === 'IN_SERVICE' && (
                      <s-badge tone="success">In Service</s-badge>
                    )}
                    {item.status === 'WAITING' && (
                       <s-button kind="plain" onClick={() => handleUpdate(item.id)}>Serve</s-button>
                    )}
                    {item.status === 'IN_SERVICE' && (
                      <s-button kind="plain" onClick={() => handleInfo(item.id)}>Info</s-button>
                    )}
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}