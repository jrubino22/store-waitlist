//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { useEffect, useState } from "preact/hooks";

function getStringValue(value) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    if (typeof value.target?.value === "string") return value.target.value;
    if (typeof value.currentTarget?.value === "string") return value.currentTarget.value;
    if (typeof value.detail?.value === "string") return value.detail.value;
  }

  return "";
}

const STATUS_OPTIONS = ["WAITING", "IN_SERVICE", "DONE"];

export default function CustomerInfoScreen() {
  const id = new URLSearchParams(navigation.currentEntry.url.split("?")[1]).get("id") ?? "";

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("WAITING");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [debugMsg, setDebugMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
  
    async function loadEntry() {
      setDebugMsg("Loading customer...");
      try {
        const token = await shopify.session.getSessionToken();
        if (!token) {
          if (!cancelled) setErrorMsg("You don't have permission to use this app.");
          return;
        }
  
        const res = await fetch(`/api/waitlist/${id}`, {
          method: "GET",
          mode: "cors",
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const data = await res.json().catch(() => ({}));
  
        if (cancelled) return;
  
        if (!res.ok) {
          setErrorMsg(data?.error || `Request failed (status ${res.status}).`);
          return;
        }
  
        setCustomerName(data.item.customerName ?? "");
        setCustomerEmail(data.item.customerEmail ?? "");
        setStatus(data.item.status ?? "WAITING");
        setNotes(data.item.notes ?? "");
        setDebugMsg("Customer loaded.");
      } catch (err) {
        if (!cancelled) setErrorMsg("Network error loading customer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
  
    loadEntry();
  
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit() {
    setErrorMsg("");
    setDebugMsg("Saving changes...");
    setSubmitting(true);

    try {
      const token = await shopify.session.getSessionToken();
      if (!token) {
        setErrorMsg("You don't have permission to use this app.");
        setDebugMsg("No session token returned.");
        return;
      }

      const res = await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.error || `Request failed (status ${res.status}).`);
        setDebugMsg(`Update failed with status ${res.status}.`);
        return;
      }

      setDebugMsg("Changes saved.");
      navigation.back();
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
      setDebugMsg(`Caught error: ${String(err?.message || err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <s-scroll-box>
      <s-stack direction="block" padding="small" gap="small">
        {errorMsg ? <s-banner tone="critical">{errorMsg}</s-banner> : null}

        {debugMsg ? (
          <s-box padding="small">
            <s-text>Debug: {debugMsg}</s-text>
          </s-box>
        ) : null}

        {loading ? (
          <s-text>Loading...</s-text>
        ) : (
          <>
            <s-text-field
              label="Customer name"
              value={customerName}
              disabled
            />

            <s-text-field
              label="Email"
              value={customerEmail}
              disabled
            />

            <s-choice-list
              label="Status"
              key={status}
              defaultValue={status}
              onInput={(val) => setStatus(getStringValue(val))}
            >
              {STATUS_OPTIONS.map((s) => (
                <s-choice key={s} value={s}>{s}</s-choice>
              ))}
            </s-choice-list>

            <s-text-area
              label="Notes (optional)"
              value={notes}
              onInput={(val) => setNotes(getStringValue(val))}
              placeholder="Allergy, preferred staff member, etc."
            />

            <s-button
              kind="primary"
              loading={submitting}
              disabled={submitting}
              onClick={handleSubmit}
            >
              Save changes
            </s-button>

            <s-button onClick={() => navigation.back()}>
              Back
            </s-button>
          </>
        )}
      </s-stack>
    </s-scroll-box>
  );
}