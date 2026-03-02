//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { useMemo, useState } from "preact/hooks";

function getStringValue(value) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    if (typeof value.target?.value === "string") return value.target.value;
    if (typeof value.currentTarget?.value === "string") return value.currentTarget.value;
    if (typeof value.detail?.value === "string") return value.detail.value;
  }

  return "";
}

export default function AddCustomerScreen() {
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugMsg, setDebugMsg] = useState("");

  const customerName = useMemo(() => {
    const safeFirstName = String(customerFirstName ?? "").trim();
    const safeLastName = String(customerLastName ?? "").trim();
    return safeFirstName && safeLastName ? `${safeFirstName} ${safeLastName}` : "";
  }, [customerFirstName, customerLastName]);

  const canSubmit = useMemo(() => {
    return customerName.length > 0 && !submitting;
  }, [customerName, submitting]);

  async function handleSubmit() {
    console.log("handleSubmit fired", customerFirstName, customerLastName);
    setErrorMsg("");
    setSuccessMsg("");
    setDebugMsg("Starting submit...");

    const safeFirstName = String(customerFirstName ?? "").trim();
    const safeLastName = String(customerLastName ?? "").trim();
    const safeEmail = String(customerEmail ?? "").trim();
    const safeNotes = String(notes ?? "").trim();

    if (!safeFirstName || !safeLastName) {
      setErrorMsg("Customer first name and last name are required.");
      setDebugMsg("Validation failed: missing first or last name.");
      return;
    }

    setSubmitting(true);

    try {
      setDebugMsg("Getting session token...");
      const token = await shopify.session.getSessionToken();

      if (!token) {
        setErrorMsg("You don’t have permission to use this app.");
        setDebugMsg("No session token returned.");
        return;
      }

      setDebugMsg("Getting current session...");
      const session = shopify.session.currentSession;
      const locationId = session?.locationId;

      if (!locationId) {
        setErrorMsg("Could not determine the current location in POS.");
        setDebugMsg("Missing locationId from current session.");
        return;
      }

      const payload = {
        locationId: String(locationId),
        customerName,
        customerEmail: safeEmail ? safeEmail : null,
        notes: safeNotes ? safeNotes : null,
      };

      console.log("pre fetch payload", payload);
      setDebugMsg(`Posting to /api/waitlist for location ${locationId}...`);

      const res = await fetch("/api/waitlist", {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      console.log("post fetch status", res.status);
      console.log("post fetch data", data);

      if (!res.ok) {
        const msg =
          data?.error || data?.message || `Request failed (status ${res.status}).`;
        setErrorMsg(msg);
        setDebugMsg(`Request failed with status ${res.status}.`);
        return;
      }

      setSuccessMsg("Added to waitlist.");
      setDebugMsg("Success: customer added to waitlist.");

      setCustomerFirstName("");
      setCustomerLastName("");
      setCustomerEmail("");
      setNotes("");

      navigation.back();
    } catch (err) {
      console.log("submit error", String(err?.message || err));
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
        {successMsg ? <s-banner tone="success">{successMsg}</s-banner> : null}

        {debugMsg ? (
          <s-box padding="small">
            <s-text>Debug: {debugMsg}</s-text>
          </s-box>
        ) : null}

        <s-text-field
          label="Customer first name"
          value={customerFirstName}
          onInput={(value) => setCustomerFirstName(getStringValue(value))}
          placeholder="Jane"
          required
        />

        <s-text-field
          label="Customer last name"
          value={customerLastName}
          onInput={(value) => setCustomerLastName(getStringValue(value))}
          placeholder="Doe"
          required
        />

        <s-text-field
          label="Email (optional)"
          value={customerEmail}
          onInput={(value) => setCustomerEmail(getStringValue(value))}
          placeholder="jane@example.com"
        />

        <s-text-area
          label="Notes (optional)"
          value={notes}
          onInput={(value) => setNotes(getStringValue(value))}
          placeholder="Allergy, preferred staff member, etc."
        />

        <s-button
          kind="primary"
          disabled={!canSubmit}
          loading={submitting}
          onClick={handleSubmit}
        >
          Add customer
        </s-button>

        <s-button onClick={() => navigation.back()}>
            Back
        </s-button>
      </s-stack>
    </s-scroll-box>
  );
}